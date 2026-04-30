# Performance audit — where the 10 seconds goes

Status: items **A (caching)** and **C (streaming)** from the ranked
fixes are now **shipped**. Diagnosis instrumentation still in place.
The original audit + estimates are kept below; updates note shipped
state at each affected section.

Server-side timing log (`analyze_timing`, JSON line) now includes
two extra fields beyond the original instrumentation:

- `cache_status`: `'hit'` or `'miss'` — distinguishes cached responses
  (served in <100ms with no OpenAI call) from fresh LLM streams.
- `ttfb_ms`: time from request-out-to-OpenAI to first chunk back.
  Captures OpenAI's "thinking" pause before the model starts
  emitting tokens. Null on cache hits.

## TL;DR

**The bottleneck is almost certainly LLM output generation time.** The
pipeline is one synchronous OpenAI `gpt-4o` call with `response_format:
json_object`, awaited end-to-end before anything is sent to the
client. There is no streaming, no caching, no preprocessing, no
fallback path. Latency scales roughly linearly with output token count,
and our output is verbose — each Latin word produces a JSON object
with ~10 morphology fields, plus a translation, plus a relatedWords
array. The biggest single intervention available is **switching to a
faster-output model** (Claude Haiku 4.5 is 2–3× faster on structured
JSON than gpt-4o); the second biggest is **caching** (the four
example chips and any repeat traffic become instant); the third is
**streaming** (no wall-time win, but huge perceived-speed win).

Target after sprint 2: under 4s for a typical sentence end-to-end.
Stretch: under 2s. Whitaker's Words instant is unrealistic with any
LLM — that's a different architecture (local dictionary lookup, no
inference). We're not trying to match it; we're trying to be faster
than the user pasting the sentence into Claude.ai directly (~2–4s).

---

## The pipeline

What happens on a single click of the **Analyze** button:

1. Client (`App.tsx:170-174`) sends `POST /api/analyze` with
   `{ sentence }`.
2. `vercel.json` rewrites `/api/(.*)` to the Vercel serverless
   function at `api/analyze.ts:82` (production). Local dev uses an
   identical Express handler at `server/src/routes/analyze.ts:65`.
3. **Validation** (~0ms): method check, sentence length, env-var
   presence.
4. **OpenAI call** (the big one): `client.chat.completions.create`
   with `model: 'gpt-4o'`, `temperature: 0`, `response_format:
   { type: 'json_object' }`. Awaited.
5. Server reads `completion.choices[0].message.content`, runs
   `JSON.parse`, calls `res.json(parsed)`.
6. Client `await fetch`, `await res.text()`, `JSON.parse`,
   `setResult(...)`. React re-renders the analysis tree.

**Critical facts:**

- One LLM call per request — no chained or parallel calls.
- Output is the entire analysis JSON, parsed and returned in one
  shot. Not streamed.
- Loading state in the UI (skeleton + rotating "Reading this one
  carefully..." messages, `App.tsx:15-147`) covers the wait but
  doesn't reduce it. User can't act on anything until the whole JSON
  arrives.
- No server-side cache. Every request — including the four "try
  this" example chips on the landing page — re-pays the full LLM
  cost.
- Vercel serverless. Cold starts add 0–3s on top of all other
  latency for the first request after idle.

---

## Token math — why output dominates

System prompt (measured):

- 7,417 characters / 1,066 words / 75 lines
- ~2,000 tokens (best estimate; OpenAI tokenizer is typically between
  3 and 4 chars/token for this prose-plus-schema content)

This is fixed cost per request — every analysis sends the full prompt.
**Prompt-cache support would eliminate this on repeat calls** (Anthropic
has explicit prompt caching; OpenAI's automatic prefix caching is more
limited and less aggressive).

Output schema (per the prompt):

- `original`: 1 string copy of the input
- `clauses[]`: each clause has id, parentId, type, level, label,
  translation, plus nested `words[]` and `groups[]`
- Each `word` has id, text, lemma, role, partOfSpeech, morphology
  (8 sub-fields), translation, relatedWords. Roughly 50–80 tokens
  per word in JSON form.
- `groups[]` per clause: ~30–50 tokens each
- `fullTranslation`: 50–100 tokens

**Output sizes by sentence length (estimates):**

| Sentence | Words | Clauses | Est. output tokens |
|---|---|---|---|
| "Gallia est omnis divisa in partes tres" | 7 | 1 | ~700–1,000 |
| "Helvetii ea spe deiecti navibus iunctis ratibusque compluribus factis" | 10 | 1 + 2 AbsAbs groups | ~1,200–1,800 |
| "Caesari cum id nuntiatum esset, eos … pervenit" (BG 1.7) | 28 | 3 (cum + ind. stmt + main) | ~3,500–5,500 |

**gpt-4o JSON-mode output speed:** typically 80–150 tokens/sec
depending on load. Plus 0.5–1.5s time-to-first-token.

**Predicted total LLM time:**

| Output tokens | At 80 tps | At 150 tps |
|---|---|---|
| 1,000 | ~14s | ~8s |
| 2,000 | ~26s | ~14s |
| 5,000 | ~63s | ~34s |

The user's reported "~10s typical" matches the lower-end output
case at decent throughput. The longer Caesar sentence (BG 1.7) has
likely been brushing the 30-second OpenAI client timeout
(`api/analyze.ts:106`).

---

## Where the time goes — predicted breakdown

For a typical 10s analysis on a warm Vercel function, my breakdown
estimate before live measurement:

| Phase | Estimated time | % of total |
|---|---|---|
| Validation + setup | <10ms | ~0% |
| Network: server → OpenAI | 50–150ms | 1–2% |
| TTFT (LLM "thinks") | 500–1,500ms | 5–15% |
| Output token generation | 5,000–9,000ms | 50–90% |
| Network: OpenAI → server | <100ms | 1% |
| JSON.parse + res.json | <20ms | ~0% |
| Network: server → client | 50–100ms | 1% |
| Client parse + render | <100ms | 1% |

Cold start adds 1,000–3,000ms on top of all of this when the
function has been idle. First user of the day, or first user after
a redeploy: pays the cold-start tax.

The ~80–90% concentration in output generation is what makes
**model choice and output-size reduction the highest-leverage fixes**.

---

## Live instrumentation (deployed in this PR)

Both handlers now log a structured JSON line per analysis:

```json
{
  "type": "analyze_timing",
  "sentence_chars": 38,
  "sentence_words": 7,
  "validation_ms": 1,
  "llm_ms": 8421,
  "parse_ms": 3,
  "total_ms": 8425,
  "prompt_tokens": 1987,
  "completion_tokens": 1124,
  "total_tokens": 3111,
  "model": "gpt-4o-2024-08-06"
}
```

To read these:

- **Vercel (prod):** Functions tab → click the `/api/analyze`
  function → Logs. Filter for `analyze_timing` to get only the
  structured rows.
- **Local Express:** runs to stdout from `npm run dev`. (Note: the
  local server still doesn't boot until you `npm install --prefix
  syntaxis/server` to pick up the missing `resend` dep.)

A handful of requests will tell us:

1. **Is `llm_ms` actually 80%+ of `total_ms`?** Confirms the
   dominant-cost diagnosis.
2. **What's the actual token-throughput?** `completion_tokens /
   (llm_ms / 1000)` gives our observed tps. If it's notably below
   80–100, OpenAI is throttling us or under load.
3. **Cold start signature.** The first request after idle will
   show a much larger gap between `total_ms` and `validation_ms +
   llm_ms + parse_ms` — that gap is invisible to the handler but
   shows up as wall time in the client. Compare with the second
   request 2–3 seconds later.
4. **Output-size scaling.** Plot `completion_tokens` against
   `sentence_words`. Confirms our linear-in-output-size hypothesis.

---

## Ranked fixes

Each entry: expected speedup, implementation cost, risk.

### A. Cache analyses by sentence hash — **SHIPPED**

In-memory or KV-backed cache keyed by SHA-256 of the trimmed input.
Hit returns the cached JSON in <50ms. Miss falls through to OpenAI
as today.

- **Speedup:** ~10s → ~50ms on cache hits. Demo path (the four
  example chips) becomes effectively instant if warmed at deploy
  time. Repeat traffic from teachers using the same textbook
  sentences also benefits enormously.
- **Effort:** small. ~50 lines for an LRU Map + hash + serve-on-hit
  branch. Vercel KV (or Upstash Redis) is a small additional step
  if we want cache to survive cold starts; the in-memory variant is
  free but doesn't survive function recycling.
- **Risk:** stale cache if we change the prompt. Mitigation: include
  a prompt-version hash in the cache key, so prompt edits invalidate
  the cache. Trivial.
- **Scope:** server-only change. No client touch.
- **As shipped:** in-memory `Map` with manual LRU eviction (cap 500),
  keyed by `sha256(SYSTEM_PROMPT).slice(0,8) + ":" + sha256(sentence)`.
  Lives per Vercel function instance — cold starts wipe it; within an
  instance's life, repeat traffic is instant. No proactive warming
  (would burn credits on every cold start). For persistent caching
  across instances, drop in Vercel KV or Upstash Redis as a follow-up.

### B. Switch model: `gpt-4o` → `claude-haiku-4-5` (HIGH impact, MEDIUM effort)

Anthropic's Haiku 4.5 is typically 2–3× faster than gpt-4o on
structured JSON output, and the prompt caching that ships with
Anthropic (5-minute TTL on system prompts) further amortizes our
~2,000-token static prompt across requests.

- **Speedup:** ~10s → ~3–5s for a typical sentence. Bigger relative
  gain on longer sentences (where output tokens dominate).
- **Effort:** medium. Add `@anthropic-ai/sdk`, port the JSON-mode
  call, set up prompt caching with `cache_control` blocks. Keep
  the same SYSTEM_PROMPT text — it's already validated.
- **Risk:** different model = different output quality. Need to
  re-run the AbsAbs verification cases (5 sentences) and the
  clause-ordering verification cases (7 sentences) under Haiku
  before declaring success. Some prompt-tuning tweaks may be
  necessary.
- **Scope:** both handlers, plus a new dep, plus testing.

### C. Streaming with progressive client render — **SHIPPED**

Switch the OpenAI/Anthropic call to `stream: true`, parse JSON
incrementally on the client (e.g., partial-json or a small
hand-rolled parser), and render clause cards as they arrive instead
of waiting for the full payload.

- **Speedup:** *no wall-time win* — the LLM still takes the same
  time to generate. But perceived speed jumps massively: first
  card appears at ~T+1.5s instead of the user staring at a
  skeleton for 10 seconds. For a tool whose primary first-impression
  cost is the wait, this is a real UX improvement.
- **Effort:** large. SSE or chunked transfer on the server side,
  partial-JSON parsing on the client side, incremental React
  rendering, careful error handling on truncation. The skeleton +
  rotating-message UI we already have makes the existing wait less
  awful, so streaming is value-add not requirement.
- **Risk:** medium. Partial JSON parsing is a known sharp edge —
  need to handle the model emitting unbalanced braces mid-stream.
- **Scope:** server + client.
- **As shipped:** server uses OpenAI `stream: true` +
  `stream_options: { include_usage: true }`, forwarding each
  `delta.content` chunk straight to the response body. Client reads
  via `res.body.getReader()` and runs a hand-rolled partial-JSON
  parser (`tryParsePartial` in `App.tsx`) that walks the buffer,
  finds the last well-formed closing brace, and closes any unmatched
  open structures. The parser guarantees clauses inside the partial
  result are either fully formed or absent — never half-built.
  Defensive `?? []` guards in `ClauseCard` belt-and-brace it.

### D. Reduce prompt size (LOW–MEDIUM impact, MEDIUM effort)

The system prompt has grown to ~2,000 tokens with all the recent
rules added (AbsAbs, ordering, parentId, level, dative-attribution).
Some of this could be condensed without losing fidelity.

- **Speedup:** ~300–500ms saved on input processing per request
  (because TTFT scales mildly with prompt length), and dollar cost
  per request drops proportionally. **Largely subsumed by Anthropic
  prompt caching** (option B), which makes the prompt size
  irrelevant on repeat calls.
- **Effort:** medium. Each rule is load-bearing — was added to fix
  a specific prior bug. Cutting requires re-running the regression
  cases.
- **Risk:** quality regression. The prompt is the source of truth
  for parsing behavior.
- **Recommendation:** skip until B ships and measurement shows it's
  still a meaningful share. Likely no longer worth doing post-B.

### E. Vercel Edge runtime (LOW–MEDIUM impact, SMALL effort)

Move the analyze handler from Node serverless to Edge runtime.
Edge functions have effectively no cold start.

- **Speedup:** -1 to -3s on cold starts only. No effect on warm
  requests. Helps the "first user of the day" experience.
- **Effort:** small. `export const config = { runtime: 'edge' }`
  in `api/analyze.ts`. Both `openai` and `@anthropic-ai/sdk` work
  on Edge.
- **Risk:** small. Edge has slightly different env-var access
  patterns and no `process` module in the strict sense. Mostly
  drop-in.
- **Scope:** Vercel handler only.

### F. Local morphology preprocessing (VERY HIGH impact, VERY LARGE effort)

Pre-tokenize the Latin sentence and resolve unambiguous morphology
locally (e.g., LatinCY, a port of Whitaker's Words to JS, or a
locally-served WASM lemmatizer), then send the LLM only the
syntactic question — *not* "what case is `navibus`?" but "given
that `navibus` is dat/abl pl, classify its role in this sentence."

- **Speedup:** halve the output token count or more. Output
  generation is our dominant cost, so this could be 4–6 seconds
  saved on top of model swap. Combined with caching and Haiku, this
  is the path to sub-2s.
- **Effort:** very large. New dependency, new pipeline stage, new
  schema (input now includes pre-analyzed tokens, output skips
  morphology fields). Architectural change.
- **Risk:** ambiguity-handling. Many Latin forms are case-ambiguous
  (`navibus` = dat or abl). Local analyzer must surface candidates,
  not pick one — the LLM still disambiguates.
- **Recommendation:** defer to a dedicated planning session.
  Highest ceiling, highest cost. After we've squeezed easier wins.

---

## Recommended sequencing

**Sprint 1 — DONE.** A (caching) + C (streaming) shipped together.
Cache hits are <100ms; streaming makes the first card appear at
~T+1.5s instead of T+10s. The user explicitly opted to keep OpenAI
`gpt-4o` rather than swap to Anthropic Haiku for now.

**Sprint 2 (next, if needed):** measure live numbers, then choose.
- If `total_ms` on cache misses is still painful: revisit B (model
  swap to claude-haiku-4-5) or E (Edge runtime to kill cold starts).
- If cold-start signature dominates in production logs: E first.

**Later:** F — local morphology preprocessing. Architectural piece;
worth its own planning session once the easier wins are in.

**Skip / not needed:** D — prompt size reduction. Marginal vs the
gains from caching. Revisit only if model swap (B) makes prompt
caching part of the design.

---

## How to verify

### Caching (item A)

1. Hit the analyzer with `Gallia est omnis divisa in partes tres`.
   Vercel log line should show `cache_status: 'miss'`, `total_ms`
   ~5–10s, and populated `prompt_tokens`/`completion_tokens`.
2. Hit it again with the same sentence within the same function
   instance lifetime. Expected: `cache_status: 'hit'`,
   `total_ms < 100ms`, all token fields `null`, `model: 'cache'`.
3. Edit any character of `SYSTEM_PROMPT`, redeploy, hit the same
   sentence: `cache_status: 'miss'` again — `PROMPT_HASH` changed
   and invalidated the prior key.

### Streaming (item C)

1. In browser devtools → Network → click the `/api/analyze`
   response. The response should be `Content-Type: application/json`
   and the body should arrive progressively (timeline view shows a
   gradual content-length growth, not a single chunk).
2. Visually: skeleton shows briefly, then the first clause card
   appears (typically at ~T+1.5s). Additional cards arrive every
   1–3s, with the final state in place by ~T+10s.
3. Server log line should include `ttfb_ms` (typically 500–1500ms,
   the LLM's "thinking" pause before first token) and `llm_ms`
   covering the full streaming duration. `cache_status: 'miss'`
   on first hit.

### Diagnostic verification

Filter Vercel function logs for `analyze_timing`, tabulate `total_ms`,
`llm_ms`, `ttfb_ms`, `completion_tokens`. Compute:

- **Cache hit rate** = count of `cache_status: 'hit'` / total. If
  high (>30%), persistent caching (Vercel KV) becomes attractive.
- **Output throughput** = `completion_tokens / (llm_ms - ttfb_ms) * 1000`.
  Expect 80–120 tokens/sec on `gpt-4o`. <80 = OpenAI under load.
- **Cold-start signature**: first request after idle vs immediate
  follow-up. Gap is your Vercel cold-start tax.

---

## Deliberately not in scope for this audit

- **Frontend rendering perf.** The skeleton + actual render is
  <100ms in any reasonable scenario. Not where the time goes.
- **Network performance tuning.** RTT to OpenAI is small relative to
  generation time and not actionable from our side.
- **Replacing the LLM entirely.** Out of scope; that's a product
  decision, not a perf fix. Local morphology (option F) is the
  closest we get to "less LLM."
- **Concurrency / queueing.** No evidence we're under load yet —
  this is a single-user latency problem, not a throughput problem.
