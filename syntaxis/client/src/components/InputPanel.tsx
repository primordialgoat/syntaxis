import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import posthog from 'posthog-js';

const MAX_CHARS = 500;

const EXAMPLES = [
  { text: 'Gallia est omnis divisa in partes tres...', author: 'Caesar' },
  { text: 'Arma virumque cano, Troiae qui primus ab oris...', author: 'Vergil' },
  { text: 'Quo usque tandem abutere, Catilina, patientia nostra?', author: 'Cicero' },
  { text: 'Dum Romae consulitur, Saguntum expugnatur!', author: 'Livy' },
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
      <div className="text-center mb-10">
        <motion.h1
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: 'easeOut' }}
          className="font-serif text-[3.25rem] sm:text-[4rem] leading-none tracking-tight text-amber-400"
          style={{ textShadow: '0 0 80px rgba(251,191,36,0.2)' }}
        >
          Syntaxis
        </motion.h1>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.55, delay: 0.18 }}
          className="mt-3 font-serif italic text-zinc-500 text-sm tracking-widest"
        >
          sententia clara fiat!
        </motion.p>
      </div>

      {/* ── Functional descriptor ──────────────────────────────── */}
      <p
        className="font-sans text-[14px] text-center mb-6"
        style={{ color: '#eae3d4', letterSpacing: '0.01em' }}
      >
        The free digital classical language sentence flow analyzer. Enter a sentence in Latin or Ancient Greek and press analyze!
      </p>

      {/* ── Search bar + form ───────────────────────────────────── */}
      <motion.form
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: 0.22 }}
        onSubmit={handleSubmit}
      >
        {/* ── Single-line search bar ────────────────────────────── */}
        <div
          className={[
            'flex items-stretch h-[68px] rounded-2xl transition-all duration-200',
            error
              ? 'ring-1 ring-red-500/50'
              : 'focus-within:ring-1 focus-within:ring-amber-500/40',
            'ring-1',
            error ? 'ring-red-500/40' : 'ring-zinc-700/60',
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
                'bg-amber-500 hover:bg-amber-400 text-zinc-950 shadow-md shadow-amber-500/25',
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

        {/* ── Example chips ─────────────────────────────────────── */}
        <div className="mt-4 flex flex-wrap gap-1.5 sm:gap-2">
          {EXAMPLES.map((ex) => (
            <button
              key={ex.text}
              type="button"
              disabled={isLoading}
              onClick={() => handleExample(ex.text, ex.author)}
              className={[
                'group flex items-center gap-1.5 pl-3 pr-2.5 py-1 rounded-full text-xs',
                'border border-zinc-800 bg-zinc-900/40 font-sans',
                'hover:border-zinc-600 hover:bg-zinc-800/60',
                'transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed',
                'max-w-full',
              ].join(' ')}
            >
              <span className="font-serif italic text-zinc-400 group-hover:text-zinc-200 transition-colors min-w-0 truncate">
                {ex.text.replace(/\.$/, '')}
              </span>
              <span className="text-zinc-600 group-hover:text-zinc-500 transition-colors font-sans not-italic shrink-0">
                — {ex.author}
              </span>
            </button>
          ))}
        </div>
      </motion.form>
    </div>
  );
}
