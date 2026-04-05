import { Router, Request, Response } from 'express';
import OpenAI from 'openai';

const router = Router();

const MAX_SENTENCE_LENGTH = 500;

const SYSTEM_PROMPT = `You are an expert Latin linguist and grammarian. Analyze the Latin sentence provided and return a single valid JSON object. Return ONLY raw JSON — no markdown fences, no explanation, no commentary.

The JSON must follow this exact structure:

{
  "original": "the original sentence string",
  "clauses": [
    {
      "id": "clause_1",
      "type": "main" | "subordinate" | "indirect_discourse" | "relative" | "participial",
      "level": 0,
      "label": "human readable label e.g. 'Main Clause', 'Purpose Clause (ut)', 'Indirect Statement'",
      "words": [
        {
          "id": "word_1",
          "text": "original Latin word as it appears",
          "lemma": "dictionary form",
          "role": "subject" | "verb" | "direct_object" | "indirect_object" | "modifier" | "preposition" | "conjunction" | "predicate_nominative" | "predicate_adjective" | "vocative" | "other",
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
          "type": "prepositional_phrase" | "noun_phrase" | "verb_phrase" | "participial_phrase" | "indirect_discourse" | "relative_clause",
          "label": "e.g. 'Prepositional Phrase: in foro'",
          "wordIds": ["word_1", "word_2"]
        }
      ],
      "translation": "English translation of this clause"
    }
  ],
  "fullTranslation": "Complete English translation of the sentence"
}

Rules:
- level 0 = main clause, 1 = first-level subordinate, 2 = nested subordinate
- Assign every word in the sentence to exactly one clause
- Word and clause ids must be unique across the whole response (e.g. word_1 through word_N globally)
- Only include morphology fields that are applicable to the part of speech
- relatedWords may be an empty array if there are no relations
- groups may be an empty array if no meaningful groupings exist
- Ensure all wordIds in groups reference valid word ids within the same clause`;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractDefinition(raw: string): string {
  const text = stripHtml(raw);
  if (!text) return '';
  if (text.length <= 280) return text;
  const shortText = text.slice(0, 280);
  const lastStop = Math.max(
    shortText.lastIndexOf('. '),
    shortText.lastIndexOf('; '),
  );
  if (lastStop > 60) return shortText.slice(0, lastStop + 1);
  const lastSpace = shortText.lastIndexOf(' ');
  return shortText.slice(0, lastSpace > 0 ? lastSpace : 280).trimEnd() + '…';
}

// ─── Types for augmenting parsed response ─────────────────────────────────────

interface WordEntry {
  lemma: string;
  definition?: string;
  [key: string]: unknown;
}

interface ClauseEntry {
  words: WordEntry[];
  [key: string]: unknown;
}

interface AnalysisData {
  clauses: ClauseEntry[];
  [key: string]: unknown;
}

// ─── Route ────────────────────────────────────────────────────────────────────

router.post('/', async (req: Request, res: Response) => {
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

  const client = new OpenAI({ apiKey, timeout: 30_000 });

  try {
    // ── Latin detection pre-check ──────────────────────────────────────────────
    const langCheck = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 0,
      max_tokens: 5,
      messages: [
        {
          role: 'user',
          content: `Is the following text Latin? Answer with only a single word: 'yes' or 'no'. Do not explain. Text: ${sentence.trim()}`,
        },
      ],
    });

    const isLatinAnswer = (langCheck.choices[0]?.message?.content ?? '').trim().toLowerCase();
    if (isLatinAnswer === 'no') {
      res.status(400).json({
        error: 'not_latin',
        message: 'This tool is designed for Latin only. Please enter a Latin sentence or phrase.',
      });
      return;
    }

    // ── Main analysis ──────────────────────────────────────────────────────────
    const completion = await client.chat.completions.create({
      model: 'gpt-4o',
      temperature: 0,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: sentence.trim() },
      ],
    });

    const raw = completion.choices[0]?.message?.content;
    if (!raw) {
      res.status(502).json({ error: 'OpenAI returned an empty response.' });
      return;
    }

    let analysisData: AnalysisData;
    try {
      analysisData = JSON.parse(raw) as AnalysisData;
    } catch {
      res.status(502).json({
        error: 'The grammarians are debating this one — try rephrasing or check for typos.',
        code: 'malformed_response',
      });
      return;
    }

    // ── Fetch Logeion definitions in parallel ──────────────────────────────────
    const allWords = analysisData.clauses.flatMap((c) => c.words);
    const uniqueLemmas = [...new Set(allWords.map((w) => w.lemma))];
    const defMap = new Map<string, string>();

    await Promise.all(
      uniqueLemmas.map(async (lemma) => {
        try {
          const defRes = await fetch(
            `https://logeion.uchicago.edu/lexicon/${encodeURIComponent(lemma)}`,
            { signal: AbortSignal.timeout(5000) },
          );
          if (!defRes.ok) return;
          const defData = await defRes.json() as Record<string, unknown>;
          const raw =
            defData['lewis-short'] ??
            defData['ls'] ??
            defData['elementary-lewis'] ??
            defData['el'];
          if (raw && typeof raw === 'string') {
            const def = extractDefinition(raw);
            if (def) defMap.set(lemma, def);
          }
        } catch {
          // silently skip on timeout or network error
        }
      }),
    );

    // Inject definitions into word objects
    for (const clause of analysisData.clauses) {
      for (const word of clause.words) {
        const def = defMap.get(word.lemma);
        if (def) word.definition = def;
      }
    }

    res.json(analysisData);
  } catch (err) {
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
  }
});

export default router;
