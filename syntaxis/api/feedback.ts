import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Resend } from 'resend';

const MAX_MESSAGE_LENGTH = 2000;
const MAX_EMAIL_LENGTH = 200;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ─── Clause reports ──────────────────────────────────────────────────────────
// Optional `report` payload sent by the per-clause "Report" button. Carries the
// context of the flagged clause so the email says what was wrong.

const MAX_REPORT_SENTENCE_LENGTH = 500;
const MAX_REPORT_FIELD_LENGTH = 1000;
const MAX_REPORT_WORDS = 100;
const MAX_REPORT_WORD_FIELD_LENGTH = 100;

interface ClauseReport {
  sentence: string;
  language: 'latin' | 'greek';
  clauseLabel: string;
  clauseTranslation: string;
  fullTranslation: string;
  words: { text: string; lemma: string; role: string; partOfSpeech: string }[];
}

function optionalString(value: unknown, max: number): string | null {
  if (value === undefined || value === null) return '';
  if (typeof value !== 'string' || value.length > max) return null;
  return value.trim();
}

// Returns the validated report, or null if the payload is malformed.
function parseReport(raw: unknown): ClauseReport | null {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return null;
  const r = raw as Record<string, unknown>;

  const sentence = optionalString(r.sentence, MAX_REPORT_SENTENCE_LENGTH);
  const clauseLabel = optionalString(r.clauseLabel, MAX_REPORT_FIELD_LENGTH);
  const clauseTranslation = optionalString(r.clauseTranslation, MAX_REPORT_FIELD_LENGTH);
  const fullTranslation = optionalString(r.fullTranslation, MAX_REPORT_FIELD_LENGTH);
  if (!sentence || !clauseLabel || clauseTranslation === null || fullTranslation === null) return null;
  if (r.language !== 'latin' && r.language !== 'greek') return null;
  if (!Array.isArray(r.words) || r.words.length > MAX_REPORT_WORDS) return null;

  const words: ClauseReport['words'] = [];
  for (const w of r.words) {
    if (typeof w !== 'object' || w === null) return null;
    const wr = w as Record<string, unknown>;
    const text = optionalString(wr.text, MAX_REPORT_WORD_FIELD_LENGTH);
    const lemma = optionalString(wr.lemma, MAX_REPORT_WORD_FIELD_LENGTH);
    const role = optionalString(wr.role, MAX_REPORT_WORD_FIELD_LENGTH);
    const partOfSpeech = optionalString(wr.partOfSpeech, MAX_REPORT_WORD_FIELD_LENGTH);
    if (text === null || lemma === null || role === null || partOfSpeech === null) return null;
    words.push({ text, lemma, role, partOfSpeech });
  }

  return { sentence, language: r.language, clauseLabel, clauseTranslation, fullTranslation, words };
}

function formatReportEmail(report: ClauseReport, message: string, email: string): string {
  const language = report.language === 'greek' ? 'Ancient Greek' : 'Latin';
  const words = report.words
    .map((w) => `${w.text} (${[w.role, w.partOfSpeech, w.lemma].filter(Boolean).join(', ')})`)
    .join(' · ');
  return [
    `REPORTED CLAUSE — ${language}`,
    '',
    `Sentence:     ${report.sentence}`,
    `Clause:       ${report.clauseLabel}`,
    `Words:        ${words || '(none)'}`,
    `Clause tr.:   ${report.clauseTranslation || '(none)'}`,
    `Full tr.:     ${report.fullTranslation || '(none)'}`,
    `From:         ${email || '(no email provided)'}`,
    '',
    'User note:',
    message,
  ].join('\n');
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const body = req.body as { message?: unknown; email?: unknown; report?: unknown };
  const { message, email } = body;

  if (typeof message !== 'string' || message.trim().length === 0) {
    res.status(400).json({ error: 'Request body must include a non-empty "message" string.' });
    return;
  }

  const trimmedMessage = message.trim();
  if (trimmedMessage.length > MAX_MESSAGE_LENGTH) {
    res.status(400).json({ error: `Message exceeds the ${MAX_MESSAGE_LENGTH} character limit.` });
    return;
  }

  let trimmedEmail = '';
  if (email !== undefined && email !== null && email !== '') {
    if (typeof email !== 'string' || email.length > MAX_EMAIL_LENGTH || !EMAIL_REGEX.test(email.trim())) {
      res.status(400).json({ error: 'Invalid email address.' });
      return;
    }
    trimmedEmail = email.trim();
  }

  let report: ClauseReport | null = null;
  if (body.report !== undefined && body.report !== null) {
    report = parseReport(body.report);
    if (!report) {
      res.status(400).json({ error: 'Invalid report details.' });
      return;
    }
  }

  const apiKey = process.env.RESEND_API_KEY;
  const toEmail = process.env.FEEDBACK_TO_EMAIL;
  const fromEmail = process.env.FEEDBACK_FROM_EMAIL;
  if (!apiKey || !toEmail || !fromEmail) {
    res.status(500).json({ error: 'Server misconfiguration: feedback email is not set up.' });
    return;
  }

  try {
    const resend = new Resend(apiKey);
    const { error } = await resend.emails.send({
      from: fromEmail,
      to: toEmail,
      replyTo: trimmedEmail || undefined,
      subject: report
        ? `Syntaxis report (${report.language === 'greek' ? 'Greek' : 'Latin'}) — ${report.clauseLabel}`
        : 'Syntaxis feedback',
      text: report
        ? formatReportEmail(report, trimmedMessage, trimmedEmail)
        : `From: ${trimmedEmail || '(no email provided)'}\n\n${trimmedMessage}`,
    });

    if (error) {
      console.error('Resend error:', error);
      res.status(502).json({ error: 'Could not send feedback right now — please try again shortly.' });
      return;
    }

    res.json({ ok: true });
  } catch (err) {
    console.error('Feedback handler error:', err);
    res.status(500).json({ error: 'Could not send feedback right now — please try again shortly.' });
  }
}
