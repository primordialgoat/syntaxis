import { Router, Request, Response } from 'express';
import OpenAI from 'openai';
import { createHash } from 'node:crypto';

const router = Router();

const MAX_SENTENCE_LENGTH = 500;

const SYSTEM_PROMPT = `You are an expert Latin linguist and grammarian. Analyze the Latin sentence provided and return a single valid JSON object. Return ONLY raw JSON — no markdown fences, no explanation, no commentary.

The JSON must follow this exact structure:

{
  "original": "the original sentence string",
  "clauses": [
    {
      "id": "clause_1",
      "parentId": "id of the clause that syntactically contains this one (omit or null for the main clause)",
      "type": "main" | "subordinate" | "indirect_discourse" | "relative" | "participial",
      "level": 0,
      "label": "human readable label e.g. 'Main Clause', 'Purpose Clause (ut)', 'Indirect Statement'",
      "words": [
        {
          "id": "word_1",
          "text": "original Latin word as it appears",
          "lemma": "dictionary form",
          "role": "subject" | "verb" | "direct_object" | "indirect_object" | "adj" | "adv" | "preposition" | "conjunction" | "predicate_nominative" | "predicate_adjective" | "vocative" | "other",
          "partOfSpeech": "noun" | "verb" | "adjective" | "adverb" | "preposition" | "conjunction" | "pronoun" | "participle" | "infinitive" | "interjection",
          "morphology": {
            "case": "nominative|genitive|dative|accusative|ablative|vocative|locative (for nouns, pronouns, adjectives, participles)",
            "number": "singular|plural (for nouns, pronouns, adjectives, participles)",
            "gender": "masculine|feminine|neuter (for nouns, pronouns, adjectives, participles)",
            "caseUsage": "e.g. 'Subject', 'Direct Object', 'Ablative of Means', 'Objective Genitive' (for nouns and pronouns)",
            "person": "1st|2nd|3rd (for verbs)",
            "tense": "present|imperfect|future|perfect|pluperfect|future perfect (for verbs and participles)",
            "mood": "indicative|subjunctive|imperative|infinitive (for verbs)",
            "voice": "active|passive (for verbs and participles)",
            "modifies": "the Latin word this adjective, adverb, or participle modifies"
          },
          "translation": "English translation of this word in context",
          "relatedWords": ["ids of related words, e.g. an adjective pointing to its noun"]
        }
      ],
      "groups": [
        {
          "id": "group_1",
          "type": "prepositional_phrase" | "noun_phrase" | "verb_phrase" | "participial_phrase" | "ablative_absolute" | "indirect_discourse" | "relative_clause",
          "label": "e.g. 'Prepositional Phrase: in foro' or 'Ablative Absolute: urbe capta'",
          "wordIds": ["word_1", "word_2"]
        }
      ],
      "translation": "English translation of this clause"
    }
  ],
  "fullTranslation": "Complete English translation of the sentence"
}

Rules:
- Emit clauses in the array in linear sentence order — sorted by the position of each clause's earliest word in the original Latin sentence. The clause whose first word appears leftmost in the Latin comes first in the array; the next, second; and so on.
- "level" is the depth of this clause in the syntactic tree. The single main clause is level 0. Any clause syntactically embedded inside another clause has level = parent.level + 1, where the parent is the clause whose verb governs this one. Specifically:
  • A subordinate clause (cum, ut, si, quod, quia, dum, postquam, etc.) attached to a verb in clause X is at level X.level + 1.
  • A relative clause modifying a noun in clause X is at level X.level + 1.
  • An indirect statement (accusative + infinitive) functioning as subject or object of a verb in clause X is at level X.level + 1.
  • An indirect question (interrogative word + subjunctive) embedded as object or complement of a verb in clause X is at level X.level + 1.
  • A substantive clause (ut / ne / quod) functioning as subject, object, or complement of a verb in clause X is at level X.level + 1.
  Embedding chains compound: an indirect statement inside a cum-clause inside the main clause is level 2, not level 1.
- "parentId" is the id of the clause that syntactically contains this one — the clause whose verb governs this clause's verb, or whose noun this clause modifies. The single main clause has no parent — omit parentId or set it to null. Every non-main clause must have a parentId pointing to an existing clause id in the same response. parentId and level must be consistent: a clause's level equals its parent's level + 1.
- Worked example for "Caesari cum id nuntiatum esset, eos … conari, maturat …": the array order is [Cum Clause (level 1, parentId = main_clause_id), Indirect Statement (level 2, parentId = cum_clause_id), Main Clause (level 0, no parentId)]. Linear sentence order; levels reflect the embedding chain (the indirect statement is the subject of "nuntiatum esset", which lives in the cum-clause, so it's a child of the cum-clause and one level deeper).
- Assign every word in the sentence to exactly one clause
- A word belongs to the clause whose verb (or other governing element) it depends on syntactically, regardless of where it sits in the sentence's surface order. In particular, a dative noun governed by a verb in clause X belongs to clause X — including the dative of indirect object, dative of reference (the judging or perceiving party), and sympathetic dative. A dative may sit at the very start of the sentence (left-of-clause hyperbaton) and still belong to whichever clause governs it. Example: in "Caesari cum id nuntiatum esset…", "Caesari" is the dative indirect object of "nuntiatum esset" and therefore belongs to the cum-clause, not the main clause, even though it appears before "cum".
- Use "adj" for words that modify a noun (or pronoun) by case/number/gender agreement: adjectives proper (e.g. "magnus", "bonus"), demonstratives in attributive use (e.g. "hic", "ille"), possessive adjectives (e.g. "meus", "noster"), numerals in agreement (e.g. "tres", "multi"), and attributive participles (e.g. "amantem" in "puerum amantem"). Do NOT use "adj" for predicate adjectives — those keep "predicate_adjective". Do NOT use "adj" for nouns in the genitive case that modify another noun (e.g. "Caesaris" in "domus Caesaris") — those are nouns and remain "other" in this revision.
- Use "adv" for words that modify a verb, adjective, or another adverb without morphological agreement: true adverbs (e.g. "celeriter", "bene", "saepe", "semper", "numquam"), intensifiers (e.g. "valde", "multum", "paene"), and negation particles (e.g. "non", "nec", "ne", "haud"). Do NOT use "adv" for nouns in the ablative or accusative case that function adverbially (e.g. ablative of means "magnis itineribus", accusative of duration "tres horas") — those are nouns and remain "other" in this revision.
- Word and clause ids must be unique across the whole response (e.g. word_1 through word_N globally)
- Only include morphology fields that are applicable to the part of speech
- relatedWords may be an empty array if there are no relations
- groups may be an empty array if no meaningful groupings exist
- Ensure all wordIds in groups reference valid word ids within the same clause
- An "ablative_absolute" group is an ablative noun (or pronoun) plus one of: (a) an ablative participle agreeing with it, e.g. "navibus iunctis", "urbe capta", "his rebus gestis"; or (b) an ablative noun or adjective standing in predicate relation to it, with no participle (because esse has no present participle), e.g. "Cicerone consule" (Cicero being consul), "me invito" (against my will), "vivo Caesare" (Caesar being alive).
- Use "ablative_absolute" only when the head ablative noun has NO syntactic role in the main clause — it is "absolute" (loosed) from the main-clause syntax. Specifically: it is not the object of a preposition, not an ablative of means/manner/agent modifying the main verb, and not modifying a noun that has a role in the main clause.
- Disambiguation:
  • "Urbe capta, Caesar discessit" → ablative_absolute (urbe has no main-clause role).
  • "Caesar urbem captam vidit" → participial_phrase modifying urbem (urbem IS the direct object of the main verb).
  • "Pugnat magnis viribus" → not ablative_absolute (ablative of means governed by pugnat).
  • "Magna celeritate venit" → not ablative_absolute (ablative of manner; one ablative noun + adjective in a manner phrase).
- The label string for an ablative absolute should begin with "Ablative Absolute:" followed by the Latin words, e.g. "Ablative Absolute: navibus iunctis".`;

// ─── Cache (in-memory LRU keyed by prompt hash + sentence hash) ──────────────

const PROMPT_HASH = createHash('sha256').update(SYSTEM_PROMPT).digest('hex').slice(0, 8);
const CACHE_MAX = 500;
const cache = new Map<string, unknown>();

function cacheKey(sentence: string): string {
  return `${PROMPT_HASH}:${createHash('sha256').update(sentence).digest('hex')}`;
}

function cacheGet(key: string): unknown | undefined {
  const value = cache.get(key);
  if (value === undefined) return undefined;
  cache.delete(key);
  cache.set(key, value);
  return value;
}

function cacheSet(key: string, value: unknown): void {
  if (cache.size >= CACHE_MAX) {
    const oldestKey = cache.keys().next().value;
    if (oldestKey !== undefined) cache.delete(oldestKey);
  }
  cache.set(key, value);
}

router.post('/', async (req: Request, res: Response) => {
  const t0 = Date.now();
  const { sentence } = req.body as { sentence?: string };

  if (!sentence || typeof sentence !== 'string' || sentence.trim().length === 0) {
    res.status(400).json({ error: 'Request body must include a non-empty "sentence" string.' });
    return;
  }

  if (sentence.trim().length > MAX_SENTENCE_LENGTH) {
    res.status(400).json({ error: `Sentence exceeds the ${MAX_SENTENCE_LENGTH} character limit.` });
    return;
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: 'Server misconfiguration: OPENAI_API_KEY is not set.' });
    return;
  }

  const trimmedSentence = sentence.trim();
  const key = cacheKey(trimmedSentence);
  const cached = cacheGet(key);

  if (cached !== undefined) {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.write(JSON.stringify(cached));
    res.end();
    const t3 = Date.now();
    console.log(JSON.stringify({
      type: 'analyze_timing',
      cache_status: 'hit',
      sentence_chars: trimmedSentence.length,
      sentence_words: trimmedSentence.split(/\s+/).length,
      validation_ms: 0,
      ttfb_ms: 0,
      llm_ms: 0,
      parse_ms: 0,
      total_ms: t3 - t0,
      prompt_tokens: null,
      completion_tokens: null,
      total_tokens: null,
      model: 'cache',
    }));
    return;
  }

  const client = new OpenAI({ apiKey, timeout: 30_000 });

  try {
    const t1 = Date.now();
    const stream = await client.chat.completions.create({
      model: 'gpt-4o',
      temperature: 0,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: trimmedSentence },
      ],
      stream: true,
      stream_options: { include_usage: true },
    });

    res.setHeader('Content-Type', 'application/json; charset=utf-8');

    let accumulated = '';
    let firstChunkAt = 0;
    let usage: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number } | null = null;
    let chunkModel: string | null = null;

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content ?? '';
      if (delta) {
        if (firstChunkAt === 0) firstChunkAt = Date.now();
        accumulated += delta;
        res.write(delta);
      }
      if (chunk.usage) usage = chunk.usage;
      if (chunk.model && !chunkModel) chunkModel = chunk.model;
    }

    res.end();
    const t2 = Date.now();

    let parsed: unknown = null;
    try {
      parsed = JSON.parse(accumulated);
    } catch {
      // Stream already finished; can't change response. Don't cache.
    }

    if (parsed !== null) cacheSet(key, parsed);

    const t3 = Date.now();
    console.log(JSON.stringify({
      type: 'analyze_timing',
      cache_status: 'miss',
      sentence_chars: trimmedSentence.length,
      sentence_words: trimmedSentence.split(/\s+/).length,
      validation_ms: t1 - t0,
      ttfb_ms: firstChunkAt > 0 ? firstChunkAt - t1 : null,
      llm_ms: t2 - t1,
      parse_ms: t3 - t2,
      total_ms: t3 - t0,
      prompt_tokens: usage?.prompt_tokens ?? null,
      completion_tokens: usage?.completion_tokens ?? null,
      total_tokens: usage?.total_tokens ?? null,
      model: chunkModel ?? 'gpt-4o',
      parse_ok: parsed !== null,
    }));
  } catch (err) {
    if (!res.headersSent) {
      if (err instanceof OpenAI.APIError) {
        const status = err.status ?? 502;
        res.status(status >= 400 && status < 600 ? status : 502).json({
          error: `OpenAI API error: ${err.message}`,
          code: err.code,
        });
        return;
      }
      const message = err instanceof Error ? err.message : 'Unknown error';
      res.status(500).json({ error: `Internal server error: ${message}` });
      return;
    }
    try { res.end(); } catch { /* ignore */ }
    console.error(JSON.stringify({
      type: 'analyze_stream_error',
      message: err instanceof Error ? err.message : 'Unknown error',
    }));
  }
});

export default router;
