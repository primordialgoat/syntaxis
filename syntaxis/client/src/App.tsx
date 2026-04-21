import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Analytics } from '@vercel/analytics/react';
import InputPanel from './components/InputPanel';
import SentenceAnalysis, { type AnalysisResult } from './components/SentenceAnalysis';
import About from './components/About';
import FeedbackForm from './components/FeedbackForm';

// ─── Loading messages ─────────────────────────────────────────────────────────

const LOADING_MESSAGES = [
  'Reading this one carefully...',
  'Looking up definitions...',
  'Identifying clauses and cases...',
  'Almost ready — this one\'s interesting!',
] as const;

// ─── Quill icon ───────────────────────────────────────────────────────────────

function QuillIcon() {
  return (
    <motion.svg
      viewBox="0 0 24 24"
      fill="none"
      className="w-5 h-5 shrink-0"
      style={{ color: '#c9a84c' }}
      animate={{ rotate: [-9, 9, -9] }}
      transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}
    >
      {/* Feather body */}
      <path
        d="M20.5 3.5C17 1 10 3.5 7 9C5 12.5 5 16 6.5 18.5L3.5 21.5"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Barbs / vane */}
      <path
        d="M6.5 18.5C9.5 17 13 14.5 16.5 9.5"
        stroke="currentColor"
        strokeWidth="0.9"
        strokeLinecap="round"
        strokeDasharray="1.5 2.2"
      />
      {/* Quill tip nib */}
      <path
        d="M3.5 21.5L6.5 18.5"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </motion.svg>
  );
}

// ─── Loading skeleton ─────────────────────────────────────────────────────────

const SKELETON_CLAUSES = [
  { words: [88, 62, 94, 72, 56, 78], indent: 0 },
  { words: [66, 84, 52, 70], indent: 1 },
  { words: [58, 72, 60], indent: 2 },
];

function LoadingSkeleton() {
  const [msgIdx, setMsgIdx] = useState(0);

  useEffect(() => {
    const id = setInterval(
      () => setMsgIdx((i) => (i + 1) % LOADING_MESSAGES.length),
      2600,
    );
    return () => clearInterval(id);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      className="max-w-[900px] mx-auto px-3 sm:px-6 py-10"
    >
      {/* Rotating message + quill */}
      <div className="flex items-center justify-center gap-3 mb-10">
        <QuillIcon />
        <AnimatePresence mode="wait">
          <motion.p
            key={msgIdx}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="font-serif italic text-sm"
            style={{ color: '#a89070' }}
          >
            {LOADING_MESSAGES[msgIdx]}
          </motion.p>
        </AnimatePresence>
      </div>

      {/* Skeleton clause cards */}
      <div className="space-y-4">
        {SKELETON_CLAUSES.map((clause, ci) => (
          <div
            key={ci}
            style={{
              marginLeft: `${clause.indent * 36}px`,
              borderRadius: '14px',
              border: '1px solid rgba(201,168,76,0.12)',
              borderLeft: '4px solid rgba(201,168,76,0.2)',
              backgroundColor: '#1c1813',
            }}
            className="p-5 sm:p-7 animate-pulse"
          >
            <div className="h-5 w-32 rounded-full mb-5" style={{ background: 'rgba(201,168,76,0.1)' }} />
            <div className="flex flex-wrap gap-3">
              {clause.words.map((w, wi) => (
                <div key={wi} className="flex flex-col items-center gap-1">
                  <div className="h-9 rounded-lg" style={{ width: `${w}px`, background: 'rgba(255,255,255,0.06)' }} />
                  <div className="h-2 w-10 rounded" style={{ background: 'rgba(255,255,255,0.04)' }} />
                </div>
              ))}
            </div>
            <div className="mt-5 pt-4 border-t" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
              <div className="h-3 rounded w-3/4" style={{ background: 'rgba(255,255,255,0.05)' }} />
            </div>
          </div>
        ))}
      </div>

      {/* Full translation placeholder */}
      <div
        className="mt-6 flex overflow-hidden rounded-2xl animate-pulse"
        style={{ border: '1px solid rgba(255,255,255,0.06)', backgroundColor: '#1c1813' }}
      >
        <div className="w-[5px] shrink-0" style={{ background: 'rgba(201,168,76,0.25)' }} />
        <div className="px-6 py-5 flex-1 space-y-2">
          <div className="h-2.5 rounded w-20" style={{ background: 'rgba(255,255,255,0.06)' }} />
          <div className="h-4 rounded w-full" style={{ background: 'rgba(255,255,255,0.05)' }} />
          <div className="h-4 rounded w-4/5" style={{ background: 'rgba(255,255,255,0.05)' }} />
        </div>
      </div>
    </motion.div>
  );
}

// ─── App ──────────────────────────────────────────────────────────────────────

export default function App() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const resultRef = useRef<HTMLDivElement>(null);

  const hasContent = isLoading || result !== null;

  const handleAnalyze = async (sentence: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sentence }),
      });

      const data: unknown = await res.json();

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

      setResult(data as AnalysisResult);

      requestAnimationFrame(() => {
        resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen">
      {/* ── Input ───────────────────────────────────────────────── */}
      <div className="w-full px-4 sm:px-6 flex flex-col items-center py-6 sm:py-8">
        <InputPanel onSubmit={handleAnalyze} isLoading={isLoading} error={error} />
      </div>

      {/* ── Hairline divider ────────────────────────────────────── */}
      <AnimatePresence>
        {hasContent && (
          <motion.div
            initial={{ opacity: 0, scaleX: 0 }}
            animate={{ opacity: 1, scaleX: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            className="h-px mx-auto max-w-2xl"
            style={{ background: 'linear-gradient(to right, transparent, rgba(201,168,76,0.2), transparent)' }}
          />
        )}
      </AnimatePresence>

      {/* ── Results ─────────────────────────────────────────────── */}
      <div ref={resultRef}>
        <AnimatePresence mode="wait">
          {isLoading ? (
            <LoadingSkeleton key="loading" />
          ) : result ? (
            <motion.div
              key="result"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.45, ease: 'easeOut' }}
            >
              <SentenceAnalysis result={result} />
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>

      {/* ── Feedback ────────────────────────────────────────────── */}
      <FeedbackForm />

      {/* ── About ───────────────────────────────────────────────── */}
      <About />
      <Analytics />
    </div>
  );
}
