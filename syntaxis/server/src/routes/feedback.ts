import { Router, Request, Response } from 'express';
import { Resend } from 'resend';

const router = Router();

const MAX_MESSAGE_LENGTH = 2000;
const MAX_EMAIL_LENGTH = 200;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

router.post('/', async (req: Request, res: Response) => {
  const { message, email } = req.body as { message?: unknown; email?: unknown };

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
      subject: 'Syntaxis feedback',
      text: `From: ${trimmedEmail || '(no email provided)'}\n\n${trimmedMessage}`,
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
});

export default router;
