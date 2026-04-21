import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import posthog from 'posthog-js';

const MAX_MESSAGE_CHARS = 2000;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Status = 'idle' | 'submitting' | 'success' | 'error';

export default function FeedbackForm() {
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState<string | null>(null);

  const trimmedMessage = message.trim();
  const trimmedEmail = email.trim();
  const emailValid = trimmedEmail.length === 0 || EMAIL_REGEX.test(trimmedEmail);
  const messageValid = trimmedMessage.length > 0 && trimmedMessage.length <= MAX_MESSAGE_CHARS;
  const canSubmit = messageValid && emailValid && status !== 'submitting';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    if (!emailValid) {
      setError('Please enter a valid email or leave it blank.');
      setStatus('error');
      return;
    }

    setStatus('submitting');
    setError(null);

    posthog.capture('feedback_submitted', {
      message_length: trimmedMessage.length,
      has_email: trimmedEmail.length > 0,
    });

    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: trimmedMessage,
          email: trimmedEmail || undefined,
        }),
      });

      const data: unknown = await res.json().catch(() => ({}));

      if (!res.ok) {
        const msg =
          typeof data === 'object' &&
          data !== null &&
          'error' in data &&
          typeof (data as { error: unknown }).error === 'string'
            ? (data as { error: string }).error
            : `Server error ${res.status}`;
        throw new Error(msg);
      }

      setStatus('success');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred.');
      setStatus('error');
    }
  };

  return (
    <div className="w-full flex flex-col items-center px-4 sm:px-6 pt-6 pb-6">
      <div className="w-full max-w-[736px]">
        <div className="text-[11px] font-sans uppercase tracking-[0.16em] text-zinc-600 mb-3 select-none">
          Send feedback
        </div>

        <AnimatePresence mode="wait">
          {status === 'success' ? (
            <motion.div
              key="success"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              className="rounded-xl px-4 py-4 font-serif italic text-amber-400"
              style={{
                background: 'rgba(201,168,76,0.06)',
                border: '1px solid rgba(201,168,76,0.25)',
              }}
            >
              Thanks — we got it.
            </motion.div>
          ) : (
            <motion.form
              key="form"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onSubmit={handleSubmit}
              className="space-y-3"
            >
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Bug, suggestion, or just a hello…"
                rows={3}
                maxLength={MAX_MESSAGE_CHARS}
                disabled={status === 'submitting'}
                spellCheck={false}
                className={[
                  'w-full px-4 py-3 rounded-xl resize-none',
                  'bg-zinc-900/70 ring-1 ring-zinc-700/60',
                  'focus:outline-none focus:ring-amber-500/40 transition-all duration-200',
                  'font-serif text-[1.0625rem] text-zinc-100 placeholder:text-zinc-600',
                  'disabled:opacity-50 disabled:cursor-not-allowed',
                ].join(' ')}
              />

              <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email (optional)"
                  disabled={status === 'submitting'}
                  autoComplete="email"
                  maxLength={200}
                  className={[
                    'flex-1 min-w-0 px-4 py-2.5 rounded-xl',
                    'bg-zinc-900/70 ring-1 ring-zinc-700/60',
                    'focus:outline-none focus:ring-amber-500/40 transition-all duration-200',
                    'font-sans text-sm text-zinc-100 placeholder:text-zinc-600',
                    'disabled:opacity-50 disabled:cursor-not-allowed',
                  ].join(' ')}
                />

                <button
                  type="submit"
                  disabled={!canSubmit}
                  className={[
                    'flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-xl shrink-0',
                    'font-sans font-bold text-sm transition-all duration-150',
                    'bg-amber-500 hover:bg-amber-400 text-zinc-950 shadow-md shadow-amber-500/25',
                    !canSubmit ? 'opacity-50 cursor-not-allowed' : '',
                  ].join(' ')}
                >
                  {status === 'submitting' ? (
                    <>
                      <svg
                        className="animate-spin w-3.5 h-3.5"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                      </svg>
                      <span>Sending…</span>
                    </>
                  ) : (
                    'Send →'
                  )}
                </button>
              </div>

              <AnimatePresence>
                {status === 'error' && error && (
                  <motion.div
                    key="error"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="flex items-start gap-2 px-4 py-3 rounded-xl bg-red-950/40 border border-red-500/25 text-red-400 text-sm font-sans">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 mt-0.5 shrink-0">
                        <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                      </svg>
                      <span>{error}</span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.form>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
