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
- level 0 = main clause, 1 = first-level subordinate, 2 = nested subordinate
- Assign every word in the sentence to exactly one clause
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

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      res.status(502).json({
        error: 'The grammarians are debating this one — try rephrasing or check for typos.',
        code: 'malformed_response',
      });
      return;
    }

    res.json(parsed);
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
