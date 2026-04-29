import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import posthog from 'posthog-js';

const MAX_CHARS = 500;

const EXAMPLES = [
  { text: 'Gallia est omnis divisa in partes tres', author: 'Caesar' },
  { text: 'Arma virumque cano, Troiae qui primus ab oris', author: 'Vergil' },
  { text: 'Quo usque tandem abutere, Catilina, patientia nostra?', author: 'Cicero' },
  { text: 'Dum Romae consulitur, Saguntum expugnatur', author: 'Livy' },
] as const;

interface Props {
  onSubmit: (sentence: string) => void;
  isLoading: boolean;
  error: string | null;
}

export default function InputPanel({ onSubmit, isLoading, error }: Props) {
  const [sentence, setSentence] = useState('');

  const charCount = sentence.length;
  const overLimit = charCount > MAX_CHARS;
  const canSubmit = sentence.trim().length > 0 && !isLoading && !overLimit;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (canSubmit) {
      const trimmed = sentence.trim();
      posthog.capture('sentence_analyzed', {
        sentence: trimmed,
        sentence_length: trimmed.length,
        source: 'manual',
        example_author: null,
      });
      onSubmit(trimmed);
    }
  };

  const handleExample = (text: string, author: string) => {
    const trimmed = text.trim();
    setSentence(text);
    posthog.capture('sentence_analyzed', {
      sentence: trimmed,
      sentence_length: trimmed.length,
      source: 'example_chip',
      example_author: author,
    });
    onSubmit(trimmed);
  };

  const counterColor = overLimit
    ? 'text-red-400'
    : charCount > MAX_CHARS * 0.85
    ? 'text-amber-500'
    : 'text-zinc-500';

  return (
    <div className="w-full max-w-[760px] mx-auto">
      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="text-center mb-6">
        <motion.h1
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: 'easeOut' }}
          className="font-serif text-[3.25rem] sm:text-[4rem] leading-none tracking-tight text-amber-400"
          style={{ textShadow: '0 0 80px rgba(251,191,36,0.2)' }}
        >
          Syntaxis
        </motion.h1>
      </div>

      {/* ── Subtagline (Fraunces italic, cream). Same styling as
           before — only the copy changed. */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.55, delay: 0.15 }}
        className="font-fraunces italic text-center mb-10"
        style={{ fontSize: '18px', color: '#d4d0c8' }}
      >
        A free sentence flow analyzer for Latin and Ancient Greek.
      </motion.p>

      {/* ── Search bar + form ───────────────────────────────────── */}
      <motion.form
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: 0.22 }}
        onSubmit={handleSubmit}
      >
        {/* ── Single-line search bar ──────────────────────────────
             Default border + focus ring are cream-tinted, not gold. */}
        <div
          className={[
            'flex items-stretch h-[68px] rounded-2xl transition-all duration-200',
            error
              ? 'ring-1 ring-red-500/50'
              : 'focus-within:ring-1 focus-within:ring-[rgba(232,227,212,0.35)]',
            'ring-1',
            error ? 'ring-red-500/40' : 'ring-[rgba(255,255,255,0.08)]',
            'bg-zinc-900/70',
          ].join(' ')}
        >
          {/* Text input */}
          <input
            type="text"
            value={sentence}
            onChange={(e) => setSentence(e.target.value)}
            placeholder="Enter a sentence…"
            disabled={isLoading}
            spellCheck={false}
            autoComplete="off"
            className={[
              'flex-1 min-w-0 h-full pl-4 sm:pl-7 pr-2 sm:pr-3 bg-transparent',
              'font-serif text-base sm:text-[1.125rem] text-zinc-100',
              'placeholder:text-zinc-600 focus:outline-none',
              'disabled:opacity-50 disabled:cursor-not-allowed',
            ].join(' ')}
          />

          {/* Vertical rule */}
          <div className="w-px my-[14px] bg-zinc-700/60 shrink-0" />

          {/* Right col: button (top) + counter (bottom)
               Mobile: button is vertically centered; counter pins to the bottom-right so
                       it doesn't drag the button off-center.
               Desktop: original behavior — button top, counter bottom via justify-between. */}
          <div className="relative flex flex-col items-end justify-center sm:justify-between py-[10px] pl-2 sm:pl-3 pr-2 sm:pr-3 shrink-0 w-[104px] sm:w-[150px]">
            <button
              type="submit"
              disabled={!canSubmit}
              className={[
                'flex items-center gap-1 sm:gap-1.5 px-3 sm:px-5 py-2 rounded-lg sm:rounded-xl',
                'font-sans font-bold text-xs sm:text-base transition-all duration-150',
                // Cream-fill primary action — replaces the gold button. Reads
                // as "primary" by being the brightest thing on the page rather
                // than by being yellow.
                'bg-cream hover:bg-cream-hover hover:-translate-y-px text-[#1a1610]',
                !canSubmit ? 'cursor-not-allowed' : '',
              ].join(' ')}
            >
              {isLoading ? (
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
                  <span className="hidden sm:inline">Wait…</span>
                </>
              ) : (
                <>
                  <span>Analyze</span>
                  <span className="hidden sm:inline">→</span>
                </>
              )}
            </button>

            {/* Char counter — invisible when empty to preserve layout.
                 Absolute on mobile (so it doesn't shift button off-center),
                 static on desktop (so justify-between can do its thing). */}
            <span
              className={[
                'text-[9px] sm:text-[10px] font-sans tabular-nums transition-colors duration-150 leading-none',
                'absolute bottom-[8px] right-[10px] sm:static',
                charCount === 0 ? 'invisible' : counterColor,
              ].join(' ')}
            >
              {charCount} / {MAX_CHARS}
            </span>
          </div>
        </div>

        {/* ── Error ────────────────────────────────────────────── */}
        <AnimatePresence>
          {error && (
            <motion.div
              key="error"
              initial={{ opacity: 0, height: 0, marginTop: 0 }}
              animate={{ opacity: 1, height: 'auto', marginTop: 8 }}
              exit={{ opacity: 0, height: 0, marginTop: 0 }}
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

        {/* ── Try an example — inline middot list ──────────────────
             Centered line: muted secondary "Try an example:" prefix,
             four cream author names separated by middots. Hovering an
             author shows the full Latin sentence as a native tooltip;
             clicking re-runs the analyzer in place via handleExample. */}
        <p
          className="text-center mt-6 font-sans"
          style={{ fontSize: '13px', color: '#8A8680', lineHeight: 1.7 }}
        >
          Try an example:{' '}
          {EXAMPLES.map((ex, i) => (
            <span key={ex.author}>
              {i > 0 && (
                <span className="mx-2.5" style={{ color: '#6a6660' }} aria-hidden="true">
                  ·
                </span>
              )}
              <button
                type="button"
                title={ex.text}
                onClick={() => handleExample(ex.text, ex.author)}
                disabled={isLoading}
                className="font-sans bg-transparent border-0 p-0 cursor-pointer transition-colors duration-150 disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ fontSize: '13px', color: '#d4d0c8' }}
                onMouseEnter={(e) => {
                  if (!isLoading) e.currentTarget.style.color = '#f0ebdc';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = '#d4d0c8';
                }}
              >
                {ex.author}
              </button>
            </span>
          ))}
        </p>
      </motion.form>
    </div>
  );
}
