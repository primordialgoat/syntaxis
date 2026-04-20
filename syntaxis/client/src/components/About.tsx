import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import posthog from 'posthog-js';

export default function About() {
  const [open, setOpen] = useState(false);

  const handleToggle = () => {
    setOpen((v) => {
      if (!v) posthog.capture('about_opened');
      return !v;
    });
  };

  return (
    <div
      id="about"
      className="w-full flex flex-col items-center px-4 sm:px-6 pt-6 pb-12"
      style={{ maxWidth: '760px', margin: '0 auto' }}
    >
      {/* ── Trigger ────────────────────────────────────────────────── */}
      <button
        onClick={handleToggle}
        className="flex items-center gap-1.5 select-none transition-colors duration-150"
        style={{
          fontFamily: "'Lora', Georgia, serif",
          fontSize: '11.5px',
          letterSpacing: '0.24em',
          textTransform: 'uppercase',
          color: 'var(--amber-deep)',
        }}
      >
        — About Syntaxis —
        <motion.span
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.25, ease: 'easeInOut' }}
          className="inline-block leading-none mt-px"
        >
          ▾
        </motion.span>
      </button>

      {/* ── Expandable content ─────────────────────────────────────── */}
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="about-body"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="overflow-hidden w-full"
          >
            <div
              className="mt-5 py-1.5 pl-6 pr-4"
              style={{ borderLeft: '3px solid var(--amber)' }}
            >
              <p className="font-serif mb-4" style={{ fontSize: '16.5px', color: 'var(--ink-soft)', lineHeight: '1.75' }}>
                Tired of clunky tools like Whitaker's Words when trying to make sense of the classics? Wish there were a
                friendlier way to understand beautiful classical languages like Latin and Ancient Greek, where tiny
                word-endings make all the difference in translation?
              </p>

              <p className="font-serif mb-4" style={{ fontSize: '16.5px', color: 'var(--ink-soft)', lineHeight: '1.75' }}>
                As a 6-year student of the classics at Belmont Hill School, Brandon Li '26 felt the same way.
                So — with the support of the BH classics department — he built Syntaxis: a warm, interactive workbench
                for dissecting classical languages and connecting the dots, so that studying the classics is{' '}
                <i>laetius</i> rather than <i>odiosus</i>, as it should be.
              </p>

              <p className="font-serif mb-4" style={{ fontSize: '16.5px', color: 'var(--ink-soft)', lineHeight: '1.75' }}>
                It runs every query through UChicago's Logeion for precise dictionary definitions, then uses careful AI
                prompting to map out the sentence architecture: nested clauses, prepositional phrases, case usage, and
                an optional English translation — all beautifully color-coded and dynamically interactive.
              </p>

              <p className="font-serif mb-4" style={{ fontSize: '16.5px', color: 'var(--ink-soft)', lineHeight: '1.75' }}>
                Whether you're learning Latin or Ancient Greek for the first time, translating passages for coursework,
                or simply studying classical languages for the pure joy of it — Syntaxis is here to make sense of the
                classics with you.
              </p>

              <p className="font-serif" style={{ fontSize: '16.5px', color: 'var(--ink-soft)', lineHeight: '1.75' }}>
                Comments and feedback:{' '}
                <a
                  href="mailto:lllenterprises68@gmail.com"
                  style={{ color: 'var(--amber-deep)', textDecoration: 'underline', textDecorationColor: 'var(--amber)' }}
                >
                  lllenterprises68@gmail.com
                </a>
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
