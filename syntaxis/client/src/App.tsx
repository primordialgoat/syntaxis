import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Analytics } from '@vercel/analytics/react';
import InputPanel from './components/InputPanel';
import SentenceAnalysis, { type AnalysisResult } from './components/SentenceAnalysis';
import About from './components/About';
import GreekSide from './components/GreekSide';
import RomanSide from './components/RomanSide';

// ─── Loading messages ─────────────────────────────────────────────────────────

const LOADING_MESSAGES = [
  'Reading this one carefully...',
  'Looking up definitions...',
  'Identifying clauses and cases...',
  "Almost ready — this one's interesting!",
] as const;

// ─── Quill icon ───────────────────────────────────────────────────────────────

function QuillIcon() {
  return (
    <motion.svg
      viewBox="0 0 24 24"
      fill="none"
      className="w-5 h-5 shrink-0"
      style={{ color: 'var(--amber)' }}
      animate={{ rotate: [-9, 9, -9] }}
      transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}
    >
      <path d="M20.5 3.5C17 1 10 3.5 7 9C5 12.5 5 16 6.5 18.5L3.5 21.5"
            stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M6.5 18.5C9.5 17 13 14.5 16.5 9.5"
            stroke="currentColor" strokeWidth="0.9" strokeLinecap="round" strokeDasharray="1.5 2.2"/>
      <path d="M3.5 21.5L6.5 18.5"
            stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
    </motion.svg>
  );
}

// ─── Loading skeleton (light theme) ──────────────────────────────────────────

const SKELETON_CLAUSES = [
  { words: [88, 62, 94, 72, 56, 78], indent: 0 },
  { words: [66, 84, 52, 70],         indent: 1 },
  { words: [58, 72, 60],             indent: 2 },
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
            style={{ color: 'var(--ink-muted)' }}
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
              border: '1.5px solid var(--rule)',
              borderLeft: '5px solid rgba(184,121,31,0.3)',
              backgroundColor: 'var(--cream)',
            }}
            className="p-5 sm:p-7 animate-pulse"
          >
            <div className="h-5 w-32 rounded-full mb-5" style={{ background: 'rgba(184,121,31,0.15)' }} />
            <div className="flex flex-wrap gap-3">
              {clause.words.map((w, wi) => (
                <div key={wi} className="flex flex-col items-center gap-1">
                  <div className="h-9 rounded-lg" style={{ width: `${w}px`, background: 'rgba(0,0,0,0.07)' }} />
                  <div className="h-2 w-10 rounded"  style={{ background: 'rgba(0,0,0,0.04)' }} />
                </div>
              ))}
            </div>
            <div className="mt-5 pt-4 border-t" style={{ borderColor: 'rgba(0,0,0,0.07)' }}>
              <div className="h-3 rounded w-3/4" style={{ background: 'rgba(0,0,0,0.05)' }} />
            </div>
          </div>
        ))}
      </div>

      {/* Full translation placeholder */}
      <div
        className="mt-6 flex overflow-hidden rounded-2xl animate-pulse"
        style={{ border: '1.5px solid var(--rule)', backgroundColor: 'var(--cream)' }}
      >
        <div className="w-[5px] shrink-0" style={{ background: 'rgba(184,121,31,0.35)' }} />
        <div className="px-6 py-5 flex-1 space-y-2">
          <div className="h-2.5 rounded w-20" style={{ background: 'rgba(0,0,0,0.06)' }} />
          <div className="h-4 rounded w-full"  style={{ background: 'rgba(0,0,0,0.05)' }} />
          <div className="h-4 rounded w-4/5"   style={{ background: 'rgba(0,0,0,0.05)' }} />
        </div>
      </div>
    </motion.div>
  );
}

// ─── App ──────────────────────────────────────────────────────────────────────

export default function App() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError]   = useState<string | null>(null);
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
          typeof data === 'object' && data !== null && 'error' in data &&
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

  // Auto-run the Caesar example on mount so users see output immediately
  useEffect(() => {
    handleAnalyze('Gallia est omnis divisa in partes tres.');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen">

      {/* ── Nav ───────────────────────────────────────────────────── */}
      <header style={{ maxWidth: '1440px', margin: '0 auto', padding: '22px 32px 10px', position: 'relative', zIndex: 10 }}>
        <div className="flex items-center justify-between flex-wrap gap-4">
          {/* Brand */}
          <div
            className="flex items-center gap-2.5"
            style={{ fontFamily: "'Fraunces', serif", fontWeight: 600, fontSize: '22px', color: 'var(--amber-deep)', letterSpacing: '-0.01em' }}
          >
            <div style={{
              width: '30px', height: '30px',
              display: 'grid', placeItems: 'center',
              background: 'var(--amber)', color: 'var(--cream)',
              borderRadius: '8px',
              fontWeight: 700, fontSize: '18px',
              transform: 'rotate(-4deg)',
              boxShadow: '2px 2px 0 var(--amber-deep)',
            }}>
              S
            </div>
            Syntaxis
          </div>

          {/* Nav links */}
          <nav className="hidden md:flex gap-7" style={{ fontFamily: "'Lora', serif", fontSize: '14.5px', color: 'var(--ink-soft)' }}>
            {[
              { label: 'Examples', href: '#analyze' },
              { label: 'Features', href: '#features' },
              { label: 'About',    href: '#about' },
            ].map(({ label, href }) => (
              <a
                key={label}
                href={href}
                className="py-1.5 border-b-[1.5px] border-transparent transition-colors duration-150"
                style={{ color: 'inherit', textDecoration: 'none' }}
                onMouseEnter={(e) => (e.currentTarget.style.borderBottomColor = 'var(--amber)')}
                onMouseLeave={(e) => (e.currentTarget.style.borderBottomColor = 'transparent')}
              >
                {label}
              </a>
            ))}
          </nav>

          {/* CTA */}
          <a
            href="#analyze"
            className="flex items-center gap-2 transition-transform duration-150 hover:-translate-y-px"
            style={{
              padding: '8px 16px',
              background: 'var(--ink)',
              color: 'var(--cream)',
              borderRadius: '999px',
              fontFamily: "'Lora', serif",
              fontSize: '13.5px',
              fontWeight: 500,
              textDecoration: 'none',
              border: '1.5px solid var(--ink)',
            }}
          >
            Open the workbench →
          </a>
        </div>
      </header>

      {/* ── Hero ──────────────────────────────────────────────────── */}
      <section id="analyze" className="hero-layout">

        {/* Greek side */}
        <GreekSide />

        {/* Center column */}
        <div className="hero-center">

          {/* Kicker */}
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45 }}
            className="inline-flex items-center gap-2.5 mb-5"
            style={{
              fontFamily: "'Caveat', cursive",
              fontSize: '22px',
              color: 'var(--terracotta)',
              background: '#fff6e4',
              border: '1.5px dashed var(--terracotta)',
              padding: '6px 16px',
              borderRadius: '999px',
              transform: 'rotate(-1.5deg)',
            }}
          >
            <span
              className="kicker-dot"
              style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--olive)', display: 'inline-block' }}
            />
            salvete, discipuli! welcome to Syntaxis
          </motion.div>

          {/* Title */}
          <motion.h1
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.1, ease: 'easeOut' }}
            style={{
              fontFamily: "'Fraunces', serif",
              fontWeight: 500,
              fontSize: 'clamp(46px, 5.4vw, 74px)',
              lineHeight: 1.03,
              letterSpacing: '-0.022em',
              margin: '6px 0 16px',
              color: 'var(--ink)',
            }}
          >
            Read Latin &amp; Greek{' '}
            <em style={{ fontStyle: 'italic', color: 'var(--amber-deep)', fontWeight: 500 }}>
              like your teacher
            </em>{' '}
            marks it.
          </motion.h1>

          {/* Tagline */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.45, delay: 0.22 }}
            style={{
              fontFamily: "'Caveat', cursive",
              fontSize: '28px',
              color: 'var(--olive)',
              margin: '-2px 0 16px',
              transform: 'rotate(-0.8deg)',
            }}
          >
            sententia clara fit — the sentence becomes clear
          </motion.div>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.45, delay: 0.3 }}
            style={{ maxWidth: '560px', margin: '0 auto 26px', fontSize: '17.5px', color: 'var(--ink-soft)', lineHeight: '1.55' }}
          >
            A friendly, visual workbench for Latin and Ancient Greek. Paste a sentence and{' '}
            <strong style={{ color: 'var(--ink)', fontWeight: 600 }}>Syntaxis</strong> draws the clauses,
            color-codes every word, and shows how it all connects — definitions from UChicago's Logeion
            built right in.
          </motion.p>

          {/* Analyzer card */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.35 }}
          >
            <InputPanel onSubmit={handleAnalyze} isLoading={isLoading} error={error} />
          </motion.div>

          {/* Trust row */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.5 }}
            className="flex flex-wrap justify-center gap-6 mt-7"
            style={{ fontFamily: "'Lora', serif", fontSize: '13.5px', color: 'var(--ink-muted)' }}
          >
            <span className="flex items-center gap-2">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4 shrink-0">
                <path d="M20 6 9 17l-5-5"/>
              </svg>
              Dictionary: UChicago Logeion
            </span>
            <span className="flex items-center gap-2">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4 shrink-0">
                <path d="M12 2l3 7h7l-5.5 4 2 7L12 16l-6.5 4 2-7L2 9h7z"/>
              </svg>
              Loved at Belmont Hill &amp; beyond
            </span>
            <span className="flex items-center gap-2">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4 shrink-0">
                <circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>
              </svg>
              Analysis in ~8 seconds
            </span>
          </motion.div>
        </div>

        {/* Roman side */}
        <RomanSide />
      </section>

      {/* ── Hairline divider ──────────────────────────────────────── */}
      <AnimatePresence>
        {hasContent && (
          <motion.div
            initial={{ opacity: 0, scaleX: 0 }}
            animate={{ opacity: 1, scaleX: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            className="h-px mx-auto max-w-2xl"
            style={{ background: 'linear-gradient(to right, transparent, var(--rule), transparent)' }}
          />
        )}
      </AnimatePresence>

      {/* ── Results ───────────────────────────────────────────────── */}
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

      {/* ── Features ──────────────────────────────────────────────── */}
      <section
        id="features"
        className="max-w-[1100px] mx-auto px-6 pb-16 pt-4"
        style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '18px', alignItems: 'start' }}
      >
        {[
          {
            num: '1',
            title: 'Clauses, nested like your teacher draws them',
            body: 'Main clauses, subordinate clauses, indirect discourse — laid out in color-coded cards so the architecture is obvious at a glance.',
            tag: 'subject · verb · object, in full color',
          },
          {
            num: '2',
            title: 'Hover anything, learn everything',
            body: "Case, number, gender, case-usage, full conjugation — plus a real dictionary definition from UChicago's Logeion — on every word.",
            tag: 'no more juggling five tabs',
          },
          {
            num: '3',
            title: 'Honest help, not homework-for-you',
            body: 'Translation is hidden by default so you work it out yourself. Perfect for the classroom — and teachers can finally say yes.',
            tag: 'teacher-approved by design',
          },
        ].map((f) => (
          <div
            key={f.num}
            className="relative mt-4"
            style={{
              background: 'var(--cream)',
              border: '1.5px solid var(--rule)',
              borderRadius: '16px',
              padding: '28px 22px 22px',
            }}
          >
            {/* Number badge */}
            <div style={{
              position: 'absolute', top: '-14px', left: '18px',
              width: '32px', height: '32px',
              display: 'grid', placeItems: 'center',
              background: 'var(--amber)', color: 'var(--cream)',
              borderRadius: '50%',
              fontFamily: "'Fraunces', serif", fontWeight: 600, fontSize: '17px',
              boxShadow: '2px 2px 0 var(--amber-deep)',
            }}>
              {f.num}
            </div>
            <h3 style={{ fontFamily: "'Fraunces', serif", fontWeight: 500, fontSize: '21px', margin: '8px 0 8px', color: 'var(--ink)' }}>
              {f.title}
            </h3>
            <p style={{ fontSize: '15px', color: 'var(--ink-soft)', margin: 0, lineHeight: 1.6 }}>
              {f.body}
            </p>
            <div style={{ fontFamily: "'Caveat', cursive", color: 'var(--terracotta)', fontSize: '18px', marginTop: '12px' }}>
              {f.tag}
            </div>
          </div>
        ))}
      </section>

      {/* ── About ─────────────────────────────────────────────────── */}
      <About />

      {/* ── Footer ────────────────────────────────────────────────── */}
      <footer
        className="text-center mx-6 pt-5 pb-10"
        style={{ fontFamily: "'Lora', serif", fontSize: '13px', color: 'var(--ink-muted)', borderTop: '1px dashed var(--rule)' }}
      >
        Syntaxis
        <span style={{ margin: '0 10px', color: 'var(--rule)' }}>·</span>
        made for Latin &amp; Greek students
        <span style={{ margin: '0 10px', color: 'var(--rule)' }}>·</span>
        <em>sententia clara fit</em>
        <span style={{ margin: '0 10px', color: 'var(--rule)' }}>·</span>
        © MMXXVI
      </footer>

      <Analytics />
    </div>
  );
}
