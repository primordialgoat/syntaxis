import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Analytics } from '@vercel/analytics/react';
import posthog from 'posthog-js';
import InputPanel from './components/InputPanel';
import SentenceAnalysis, { type AnalysisResult } from './components/SentenceAnalysis';
import About from './components/About';
import Feedback from './components/Feedback';
import Nav from './components/Nav';
import Footer from './components/Footer';
import type { Route } from './components/routes';
import { getPreloadedExample } from './data/preloadedExamples';
import { useLanguage } from './contexts/LanguageContext';

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
      <path
        d="M20.5 3.5C17 1 10 3.5 7 9C5 12.5 5 16 6.5 18.5L3.5 21.5"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M6.5 18.5C9.5 17 13 14.5 16.5 9.5"
        stroke="currentColor"
        strokeWidth="0.9"
        strokeLinecap="round"
        strokeDasharray="1.5 2.2"
      />
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

// ─── Partial JSON parser (for streaming progressive render) ───────────────────
//
// The /api/analyze response is a JSON object streamed token-by-token from the
// model. To render clauses as they arrive we attempt to parse the accumulated
// buffer after every chunk: strict parse first; on failure, walk to the last
// well-formed closing brace, truncate, close any unmatched open structures,
// and try again. This guarantees the partial result never has half-formed
// clauses inside the clauses array — only fully-emitted ones.

function tryParsePartial(text: string): unknown {
  try { return JSON.parse(text); } catch { /* fall through */ }

  let depth = 0;
  let inString = false;
  let escape = false;
  let lastSafePos = -1;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (escape) { escape = false; continue; }
    if (c === '\\') { escape = true; continue; }
    if (c === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (c === '{' || c === '[') depth++;
    else if (c === '}' || c === ']') {
      depth--;
      if (depth >= 0) lastSafePos = i;
    }
  }

  if (lastSafePos === -1) return null;

  let safe = text.slice(0, lastSafePos + 1);
  const stack: string[] = [];
  let s = false;
  let e = false;
  for (let i = 0; i < safe.length; i++) {
    const c = safe[i];
    if (e) { e = false; continue; }
    if (c === '\\') { e = true; continue; }
    if (c === '"') { s = !s; continue; }
    if (s) continue;
    if (c === '{' || c === '[') stack.push(c);
    else if (c === '}' || c === ']') stack.pop();
  }

  safe = safe.replace(/,\s*$/, '');
  while (stack.length > 0) {
    const open = stack.pop()!;
    safe += open === '{' ? '}' : ']';
  }

  try { return JSON.parse(safe); } catch { return null; }
}

function isRenderablePartial(value: unknown): value is AnalysisResult {
  if (!value || typeof value !== 'object') return false;
  const v = value as { clauses?: unknown };
  return Array.isArray(v.clauses) && v.clauses.length > 0;
}

// Count how many clause objects have been fully closed in the streamed JSON.
// A clause object lives at depth 3 (root `{` = 1, `clauses` `[` = 2, clause
// `{` = 3), so its closing `}` brings depth back to 2. We use this so the UI
// only swaps in a card once its clause is *completely* emitted by the model
// — rendering happens card-by-card, not word-by-word.
function countCompleteClauses(text: string): number {
  let depth = 0;
  let inString = false;
  let escape = false;
  let count = 0;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (escape) { escape = false; continue; }
    if (c === '\\') { escape = true; continue; }
    if (c === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (c === '{' || c === '[') depth++;
    else if (c === '}' || c === ']') {
      depth--;
      if (c === '}' && depth === 2) count++;
    }
  }
  return count;
}

// ─── Landing page ─────────────────────────────────────────────────────────────

interface LandingProps {
  onNavigate: (route: Route) => void;
}

function Landing({ onNavigate }: LandingProps) {
  const { language } = useLanguage();
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const resultRef = useRef<HTMLDivElement>(null);

  // Clear results when language switches
  useEffect(() => {
    setResult(null);
    setError(null);
    setIsLoading(false);
    setIsStreaming(false);
  }, [language]);

  const hasContent = isLoading || result !== null;

  const handleAnalyze = async (sentence: string) => {
    // Pre-computed analyses for the Latin landing-page example chips render
    // instantly with no API call. Greek examples always go through the API.
    const preloaded = language === 'latin' ? getPreloadedExample(sentence) : null;
    if (preloaded) {
      setError(null);
      setIsLoading(false);
      setIsStreaming(false);
      setResult(preloaded);
      requestAnimationFrame(() => {
        resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
      return;
    }

    setIsLoading(true);
    setIsStreaming(true);
    setError(null);

    try {
      let res: Response;
      try {
        res = await fetch('/api/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sentence, language }),
        });
      } catch {
        throw new Error('Could not reach the analysis server. Check your connection and try again.');
      }

      // Error responses are non-streamed JSON: read all then parse for the
      // server's error message (or fall back to a status-based message).
      if (!res.ok) {
        const errorBody = await res.text();
        let errorData: unknown = null;
        if (errorBody) {
          try { errorData = JSON.parse(errorBody); } catch { /* ignore */ }
        }
        const serverMsg =
          typeof errorData === 'object' &&
          errorData !== null &&
          'error' in errorData &&
          typeof (errorData as { error: unknown }).error === 'string'
            ? (errorData as { error: string }).error
            : null;
        const fallback =
          res.status >= 500
            ? `The server ran into a problem (${res.status}). Please try again in a moment.`
            : res.status === 0
              ? 'Could not reach the analysis server. Check your connection and try again.'
              : `Request failed (${res.status}).`;
        throw new Error(serverMsg ?? fallback);
      }

      if (!res.body) {
        throw new Error('The analysis server returned an empty response. Please try again.');
      }

      // Stream the body. We only swap state when a NEW clause has been fully
      // emitted by the model — `countCompleteClauses` walks the buffer and
      // counts clause-level `}` closes. This makes cards appear card-by-card
      // (each fading in on mount via Framer Motion) instead of word-by-word
      // as tokens arrive inside an in-progress clause.
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = '';
      let lastCompleteCount = 0;
      let firstRender = false;
      let scrolled = false;

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        accumulated += decoder.decode(value, { stream: true });

        const completeCount = countCompleteClauses(accumulated);
        if (completeCount > lastCompleteCount) {
          const partial = tryParsePartial(accumulated);
          if (isRenderablePartial(partial)) {
            const truncated: AnalysisResult = {
              ...partial,
              clauses: partial.clauses.slice(0, completeCount),
            };
            if (!firstRender) {
              setIsLoading(false);
              firstRender = true;
            }
            setResult(truncated);
            lastCompleteCount = completeCount;
            if (!scrolled) {
              scrolled = true;
              requestAnimationFrame(() => {
                resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
              });
            }
          }
        }
      }
      accumulated += decoder.decode();

      // Final strict parse to ensure the complete payload is in state.
      if (accumulated) {
        try {
          const final = JSON.parse(accumulated);
          setResult(final as AnalysisResult);
        } catch {
          if (!firstRender) {
            throw new Error('The analysis server returned an unparseable response. Please try again.');
          }
          // Keep the latest renderable partial we already showed.
        }
      } else if (!firstRender) {
        throw new Error('The analysis server returned an empty response. Please try again.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred.');
    } finally {
      setIsLoading(false);
      setIsStreaming(false);
    }
  };

  return (
    <>
      <Nav currentRoute="landing" onNavigate={onNavigate} />

      {/* ── Main content (grows to push footer down) ────────────── */}
      <div className="flex-1">
        {/* ── Input ─────────────────────────────────────────────── */}
        <div className="w-full px-4 sm:px-6 flex flex-col items-center py-12 sm:py-16">
          <InputPanel key={language} onSubmit={handleAnalyze} isLoading={isLoading} error={error} />
        </div>

        {/* ── Hairline divider ──────────────────────────────────── */}
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

        {/* ── Results ───────────────────────────────────────────── */}
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
                <SentenceAnalysis result={result} isStreaming={isStreaming} />
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      </div>

      <Footer onNavigate={onNavigate} />
    </>
  );
}

// ─── App ──────────────────────────────────────────────────────────────────────

export default function App() {
  const [route, setRoute] = useState<Route>('landing');
  const { language } = useLanguage();

  useEffect(() => {
    document.documentElement.setAttribute('data-lang', language);
  }, [language]);

  // Scroll to top on route change; capture about_opened for the new-route case.
  const handleNavigate = (next: Route) => {
    if (next === 'about' && route !== 'about') {
      posthog.capture('about_opened');
    }
    setRoute(next);
    requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: 'auto' }));
  };

  return (
    <div className="min-h-screen flex flex-col">
      <AnimatePresence mode="wait">
        {route === 'about' ? (
          <About key="about" onNavigate={handleNavigate} />
        ) : route === 'feedback' ? (
          <Feedback key="feedback" onNavigate={handleNavigate} />
        ) : (
          <motion.div
            key="landing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="flex-1 flex flex-col"
          >
            <Landing onNavigate={handleNavigate} />
          </motion.div>
        )}
      </AnimatePresence>

      <Analytics />
    </div>
  );
}
