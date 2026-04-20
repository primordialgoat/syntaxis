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
    ? '#b94a48'
    : charCount > MAX_CHARS * 0.85
    ? 'var(--amber)'
    : 'var(--ink-muted)';

  return (
    <div className="w-full max-w-[640px] mx-auto">
      {/* ── Card with dashed border halo ─────────────────────────── */}
      <div style={{ position: 'relative' }}>
        {/* Dashed halo */}
        <div style={{
          position: 'absolute',
          inset: '-6px',
          border: '1px dashed var(--rule)',
          borderRadius: '22px',
          pointerEvents: 'none',
        }} />

        <div style={{
          background: 'var(--cream)',
          border: '1.5px solid var(--rule)',
          borderRadius: '18px',
          padding: '18px',
          boxShadow: 'var(--shadow)',
          position: 'relative',
        }}>
          {/* ── Input row ──────────────────────────────────────────── */}
          <form
            onSubmit={handleSubmit}
            className="input-focus-ring"
            style={{
              display: 'flex',
              gap: '8px',
              alignItems: 'center',
              background: '#ffffff',
              border: error ? '1.5px solid #b94a48' : '1.5px solid var(--rule)',
              borderRadius: '14px',
              padding: '6px 6px 6px 16px',
              transition: 'border-color .2s, box-shadow .2s',
            }}
          >
            <input
              type="text"
              value={sentence}
              onChange={(e) => setSentence(e.target.value)}
              placeholder="Try: Gallia est omnis divisa in partes tres…"
              disabled={isLoading}
              spellCheck={false}
              autoComplete="off"
              style={{
                flex: 1,
                border: 0,
                outline: 0,
                background: 'transparent',
                fontFamily: "'Lora', Georgia, serif",
                fontStyle: 'italic',
                fontSize: '17px',
                padding: '12px 4px',
                color: 'var(--ink)',
                minWidth: 0,
              }}
            />

            <button
              type="submit"
              disabled={!canSubmit}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '12px 20px',
                background: 'var(--amber)',
                color: 'var(--cream)',
                border: 0,
                borderRadius: '10px',
                fontFamily: "'Lora', Georgia, serif",
                fontSize: '15px',
                fontWeight: 600,
                cursor: canSubmit ? 'pointer' : 'not-allowed',
                opacity: canSubmit ? 1 : 0.55,
                boxShadow: canSubmit ? '0 2px 0 var(--amber-deep)' : 'none',
                transition: 'transform .15s, box-shadow .15s',
                flexShrink: 0,
              }}
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
                'Analyze →'
              )}
            </button>
          </form>

          {/* ── Error ──────────────────────────────────────────────── */}
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
                <div
                  className="flex items-start gap-2 px-4 py-3 rounded-xl text-sm font-sans"
                  style={{
                    background: 'rgba(185,74,72,0.08)',
                    border: '1px solid rgba(185,74,72,0.3)',
                    color: '#873735',
                  }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 mt-0.5 shrink-0">
                    <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                  </svg>
                  <span>{error}</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Example chips ──────────────────────────────────────── */}
          <div className="mt-4 flex flex-wrap gap-2 justify-center">
            {EXAMPLES.map((ex) => (
              <button
                key={ex.text}
                type="button"
                disabled={isLoading}
                onClick={() => handleExample(ex.text, ex.author)}
                className="flex items-center gap-2 py-[7px] px-3 rounded-full transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed"
                style={{
                  border: '1.2px solid var(--rule)',
                  background: 'transparent',
                  color: 'var(--ink-soft)',
                  fontFamily: "'Lora', Georgia, serif",
                  fontSize: '13.5px',
                  cursor: 'pointer',
                }}
              >
                <span style={{ fontStyle: 'italic' }}>{ex.text.replace(/\.$/, '').replace(/…$/, '')}</span>
                <span style={{
                  fontFamily: "'Caveat', cursive",
                  color: 'var(--terracotta)',
                  fontSize: '15px',
                  fontStyle: 'normal',
                }}>— {ex.author}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Char counter */}
      {charCount > 0 && (
        <p
          className="text-center text-[10px] font-sans mt-2 tabular-nums transition-colors duration-150"
          style={{ color: counterColor }}
        >
          {charCount} / {MAX_CHARS}
        </p>
      )}
    </div>
  );
}
