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
          "role": "subject" | "verb" | "direct_object" | "indirect_object" | "adj" | "adv" | "preposition" | "object_of_preposition" | "conjunction" | "predicate_nominative" | "predicate_adjective" | "vocative" | "other",
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
- Use "object_of_preposition" ONLY for a noun, pronoun, or substantive adjective whose role is to be the grammatical object of an explicit preposition word in the sentence. The preposition itself keeps "preposition"; only its object gets this role. In Latin this is typically a noun in the accusative (after "per", "in" + acc., "ad", "ante", "post", "trans", "circum", etc.) or in the ablative (after "ab"/"a", "ex"/"e", "de", "cum", "in" + abl., "sub" + abl., "pro", "sine", etc.). Worked examples: in "in foro", "foro" is "object_of_preposition" and "in" is "preposition". In "per provinciam nostram", "provinciam" is "object_of_preposition", "per" is "preposition", and "nostram" is "adj" (modifying "provinciam"). In "ab urbe", "urbe" is "object_of_preposition" and "ab" is "preposition". Do NOT use "object_of_preposition" for: (a) ablatives or accusatives that function adverbially without a governing preposition (e.g. ablative of means "magnis itineribus", accusative of duration "tres horas") — those remain "other"; (b) the ablative complement of a deponent verb such as utor, fruor, fungor, potior, vescor, abutor (e.g. "patientia" in "abutere patientia nostra" is governed by the deponent verb, NOT by a preposition) — those remain "other"; (c) the dative or accusative complement of any non-prepositional verb.
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

const GREEK_SYSTEM_PROMPT = `You are an expert Ancient Greek linguist and grammarian. Analyze the Ancient Greek sentence provided and return a single valid JSON object. Return ONLY raw JSON — no markdown fences, no explanation, no commentary.

The JSON must follow this exact structure:

{
  "original": "the original sentence string",
  "clauses": [
    {
      "id": "clause_1",
      "parentId": "id of the clause that syntactically contains this one (omit or null for the main clause)",
      "type": "main" | "subordinate" | "indirect_statement" | "relative" | "participial" | "genitive_absolute",
      "level": 0,
      "label": "human readable label e.g. 'Main Clause', 'Purpose Clause (ἵνα)', 'Indirect Statement', 'Genitive Absolute'",
      "words": [
        {
          "id": "word_1",
          "text": "original Greek word as it appears (preserve all accents and breathings)",
          "lemma": "dictionary form (nominative singular for nouns; 1st sg. present active indicative for verbs)",
          "role": "subject" | "verb" | "direct_object" | "indirect_object" | "adj" | "adv" | "preposition" | "object_of_preposition" | "conjunction" | "predicate_nominative" | "predicate_adjective" | "vocative" | "article" | "genitive_absolute" | "other",
          "partOfSpeech": "noun" | "verb" | "adjective" | "adverb" | "preposition" | "conjunction" | "pronoun" | "participle" | "infinitive" | "article" | "particle" | "interjection",
          "morphology": {
            "case": "nominative|genitive|dative|accusative|vocative",
            "number": "singular|dual|plural",
            "gender": "masculine|feminine|neuter",
            "caseUsage": "human-readable usage e.g. 'Subject', 'Direct Object', 'Genitive Absolute', 'Dative of Means', 'Partitive Genitive'",
            "person": "1st|2nd|3rd",
            "tense": "present|imperfect|future|aorist|perfect|pluperfect|future perfect",
            "aspect": "imperfective|aoristic|perfective",
            "mood": "indicative|subjunctive|optative|imperative|infinitive|participle",
            "voice": "active|middle|passive|middle-passive",
            "modifies": "the Greek word this adjective, adverb, article, or participle modifies"
          },
          "translation": "English translation of this word in context",
          "relatedWords": ["ids of related words, e.g. an article pointing to its noun, an adjective to its noun"]
        }
      ],
      "groups": [
        {
          "id": "group_1",
          "type": "prepositional_phrase" | "noun_phrase" | "verb_phrase" | "participial_phrase" | "genitive_absolute" | "indirect_statement" | "relative_clause" | "articular_infinitive",
          "label": "e.g. 'Prepositional Phrase: ἐν τῇ πόλει' or 'Genitive Absolute: τούτων πραχθέντων'",
          "wordIds": ["word_1", "word_2"]
        }
      ],
      "translation": "English translation of this clause"
    }
  ],
  "fullTranslation": "Complete English translation of the sentence"
}

Rules:
- Emit clauses in the array in linear sentence order — sorted by the position of each clause's earliest word in the original Greek sentence. The clause whose first word appears leftmost in the Greek comes first in the array; the next, second; and so on.
- "level" is the depth of this clause in the syntactic tree. The single main clause is level 0. Any clause syntactically embedded inside another clause has level = parent.level + 1.
- "parentId" is the id of the clause that syntactically contains this one. The main clause has no parent — omit parentId or set it to null. Every non-main clause must have a parentId pointing to an existing clause id in the same response. A genitive absolute has parentId = main clause id and level = 1.
- Assign every word in the sentence to exactly one clause. A word belongs to the clause whose verb (or governing element) it depends on syntactically.
- Word and clause ids must be unique across the whole response (word_1 through word_N globally).
- Only include morphology fields that are applicable to the part of speech.
- relatedWords may be an empty array if there are no relations.
- groups may be an empty array if no meaningful groupings exist.
- Ensure all wordIds in groups reference valid word ids within the same clause.

CASES (Ancient Greek has 5 cases — there is no ablative or locative):
- nominative: subject of finite verb; predicate nominative with copula (εἰμί, γίγνομαι)
- genitive: possession ("of"); partitive genitive ("some of"); objective genitive (object of verbal idea in a noun); genitive of source/separation; genitive of description/quality; genitive absolute (with a co-genitive participle, grammatically independent of the main clause)
- dative: indirect object; dative of means or instrument ("by means of", "with"); dative of manner; dative of time when; dative of place where (with certain verbs); dative of agent (perfect passive); dative of reference (interested party); dative of degree of difference (comparatives)
- accusative: direct object; subject of infinitive in indirect statement (accusative + infinitive); accusative of extent of time ("for X days"); accusative of extent of space; accusative of respect; cognate accusative
- vocative: direct address

NUMBER: singular, dual (only for naturally paired things when morphologically attested in the text), plural

TENSE AND ASPECT — Greek tense encodes BOTH time reference AND aspect:
- present: imperfective aspect — ongoing, repeated, or habitual action; primary tense
- imperfect: imperfective aspect — ongoing or repeated action in past time; secondary tense
- future: future time (aspect usually simple or imperfective depending on context)
- aorist: aoristic aspect — action as a simple whole, no ongoing implication; the default narrative past tense; secondary tense. Aorist imperative = single act; present imperative = ongoing/habitual action.
- perfect: perfective aspect — current state resulting from a past completed action ("has done" / "stands in the state of having done"); primary tense
- pluperfect: perfective aspect, past time — "had done"; secondary tense
- future perfect: perfective aspect, future time — rare

MOOD:
- indicative: factual statements and direct questions (all tenses)
- subjunctive: primary-sequence purpose clauses (ἵνα/ὅπως/ὡς + subj.); fear clauses after primary main verb (μή + subj.); effort clauses (ὅπως + subj.); general/indefinite conditional protasis (ἐάν + subj.); indefinite relative clauses (ὅς ἄν + subj.); deliberative questions
- optative: secondary-sequence purpose/fear after past main verb; potential optative with ἄν ("would", "could"); wishes (εἴθε/εἰ γάρ + opt.); oblique optative in indirect statement or indirect question after a past main verb (reflects original indicative/subjunctive at one degree of remoteness)
- imperative: direct commands (aorist imperative = single act; present imperative = ongoing action); prohibitions with μή + present imperative or μή + aorist subjunctive
- infinitive: complementary infinitive (after δεῖ, βούλομαι, δύναμαι, etc.); indirect statement after φημί/νομίζω/οἴομαι (accusative + infinitive construction); articular infinitive (τό + inf., functioning as a noun); subject infinitive
- participle: attributive (article + participle, equivalent to a relative clause); circumstantial (no article, expressing time/cause/concession/condition/manner/means); genitive absolute (participle + its own subject both in genitive, grammatically detached from the main clause); supplementary participle with verbs of knowing/perceiving (indirect statement construction)

VOICE:
- active: subject is the agent
- middle: subject acts on its own behalf, for its own benefit, or on its own body; also covers deponent verbs (middle/passive forms, active meaning). Many important verbs exist only in the middle (ἔρχομαι, βούλομαι, γίγνομαι, etc.)
- passive: subject receives the action; expressed by a separate conjugation in future and aorist, but uses middle endings in present, imperfect, perfect, and pluperfect
- middle-passive: use when the surface form is identical for middle and passive (present system, imperfect, perfect, pluperfect) and context does not definitively determine which interpretation applies

WORD ROLES:
- subject: nominative noun/pronoun performing the action of the finite verb. Greek often omits the subject when recoverable from the verb ending — only label explicitly present words
- verb: the main finite verb of the clause, or an infinitive/participle functioning as the clause predicate
- direct_object: accusative noun/pronoun receiving the action of a transitive verb
- indirect_object: dative noun/pronoun (indirect recipient)
- adj: adjective, demonstrative, numeral, or attributive participle modifying a noun by case/number/gender agreement and in attributive position (between article and noun, or after noun + article). Do NOT use adj for predicative adjectives
- adv: true adverb, intensifier, or negation particle (οὐ, μή, οὐκ, οὐχ, οὔτε, μήτε, etc.) modifying a verb, adjective, or adverb. Do NOT label adverbial accusatives or datives as adv
- preposition: a preposition word (ἐν, ἐπί, πρός, κατά, ἀπό, εἰς, ἐκ, παρά, ὑπό, μετά, διά, περί, ἀντί, ἀμφί, etc.)
- object_of_preposition: the noun/pronoun that is the grammatical object of an explicit preposition. Do NOT use for datives or accusatives that function adverbially without a governing preposition word
- conjunction: subordinating or coordinating conjunction, or connective particle (καί, ἀλλά, δέ, μέν, γάρ, οὖν, ὅτι, ἵνα, ὅπως, ὡς, ὅτε, εἰ, ἐάν, ὅς, ὅταν, ἐπεί, ὥστε, τε, etc.). Postpositive particles (δέ, γάρ, οὖν, μέν, τοι, τε) appear second in their clause — assign them to the clause they are postpositive in
- predicate_nominative: nominative noun completing the predicate via copula
- predicate_adjective: nominative adjective in predicative position (no article between it and the copula's subject)
- vocative: noun in the vocative case for direct address
- article: the definite article (ὁ, ἡ, τό and all declined forms). Include case/number/gender in morphology. The article's relatedWords should list the id of the word it modifies (noun, adjective, participle, or infinitive)
- genitive_absolute: assign this role to BOTH the participial subject noun AND the participle in a genitive absolute construction. The clause containing the genitive absolute should have type "genitive_absolute"
- other: pronoun with no clearer subject/object role; adverbial accusative/dative functioning as adverbial complement; anything not captured above

PARTICLES (postpositive): Greek particles normally stand second in their clause. μέν signals an antithesis; δέ introduces a contrasting or continuing clause; γάρ explains; οὖν draws a consequence; τοι asserts; γε emphasizes the preceding word. Assign as role "conjunction" (if connecting clauses) or "adv" (if modifying a single element). They belong to the clause they modify, regardless of surface word order.

THE GREEK ARTICLE has three main uses — distinguish them:
1. Attributive: article + adjective/participle in attributive position (between article and noun, or noun + article + adjective). Adjective/participle = adj role; article = article role with modifies pointing to the adjective/participle.
2. Predicative: adjective WITHOUT the article in predicate position (no article between adjective and subject noun with copula) = predicate_adjective.
3. Articular infinitive: τό + infinitive (the infinitive functions as a noun). Article = article role, modifies = the infinitive's word id. Group these as an "articular_infinitive" group.

INDIRECT STATEMENT — three distinct constructions:
1. Accusative + infinitive (with φημί, νομίζω, οἴομαι, δοκέω, οἴω, etc.): clause type "indirect_statement". The infinitive has mood "infinitive". Its accusative subject has role "subject" and caseUsage "Subject of Infinitive".
2. ὅτι/ὡς + finite verb (with λέγω, ἀγγέλλω, etc.): clause type "indirect_statement". After a past main verb, the finite verb inside may appear in the optative (oblique optative) reflecting an original indicative.
3. Supplementary participle with verbs of knowing/perceiving (ὁράω, οἶδα, γιγνώσκω, ὁράω, ἀκούω, etc.): clause type "indirect_statement". The supplementary participle has role "verb". If the participle's subject differs from the main verb's subject, it is in the accusative (caseUsage "Subject of Supplementary Participle"); if the same, it is in the nominative.

GENITIVE ABSOLUTE — when a participial phrase has both its logical subject and its participle in the genitive, AND that subject does NOT appear as any syntactic constituent (subject, object, etc.) of the main clause:
- Create a separate clause with type "genitive_absolute", parentId = main clause id, level = 1
- Both the noun and the participle get role "genitive_absolute" and caseUsage "Genitive Absolute"
- Create a group with type "genitive_absolute" listing all words in the construction
- The clause label should begin with "Genitive Absolute:" followed by the Greek words

CONDITIONAL SENTENCES: Greek has six conditional types based on mood in protasis and apodosis. Label the type in the clause label (e.g. "Protasis — General Condition (ἐάν + subj.)", "Apodosis — Simple Condition"). The protasis is a subordinate clause (parentId points to the apodosis or main clause); the apodosis is usually the main clause.

IMPORTANT: Preserve all Greek accents (acute, grave, circumflex) and breathings (smooth, rough) exactly as they appear in the input. Do not normalize, strip, or alter diacritics in the "text" field.`;

// ─── Cache (in-memory LRU keyed by prompt hash + language + sentence hash) ──

const LATIN_PROMPT_HASH = createHash('sha256').update(SYSTEM_PROMPT).digest('hex').slice(0, 8);
const GREEK_PROMPT_HASH = createHash('sha256').update(GREEK_SYSTEM_PROMPT).digest('hex').slice(0, 8);
const CACHE_MAX = 500;
const cache = new Map<string, unknown>();

function cacheKey(sentence: string, language: string): string {
  const promptHash = language === 'greek' ? GREEK_PROMPT_HASH : LATIN_PROMPT_HASH;
  return `${promptHash}:${createHash('sha256').update(sentence).digest('hex')}`;
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
  const { sentence, language = 'latin' } = req.body as { sentence?: string; language?: string };

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
  const lang = language === 'greek' ? 'greek' : 'latin';
  const key = cacheKey(trimmedSentence, lang);
  const cached = cacheGet(key);

  if (cached !== undefined) {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.write(JSON.stringify(cached));
    res.end();
    const t3 = Date.now();
    console.log(JSON.stringify({
      type: 'analyze_timing',
      cache_status: 'hit',
      language: lang,
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
  const systemPrompt = lang === 'greek' ? GREEK_SYSTEM_PROMPT : SYSTEM_PROMPT;

  try {
    const t1 = Date.now();
    const stream = await client.chat.completions.create({
      model: 'gpt-4o',
      temperature: 0,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: systemPrompt },
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
      language: lang,
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
