import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function About() {
  const [open, setOpen] = useState(false);

  return (
    <div className="w-full flex flex-col items-center px-4 sm:px-6 pt-6 pb-12">

      {/* ── Trigger ────────────────────────────────────────────────── */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 text-[11px] font-sans uppercase tracking-[0.16em] text-zinc-600 hover:text-zinc-400 transition-colors duration-150 select-none"
      >
        About Syntaxis
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
            className="overflow-hidden w-full flex justify-center"
          >
            <div
              className="mt-6 w-full max-w-[640px] py-5 sm:py-6 pl-5 sm:pl-7 pr-3"
              style={{ borderLeft: '3px solid rgba(201,168,76,0.45)' }}
            >

              <p className="font-serif text-[0.925rem] text-zinc-400 leading-[1.75] mb-5">
                Tired of using clunky tools like Whitaker's Words to learn classical languages? Wishing there was a better way
                to understand the complex structure of languages like Latin and Ancient Greek, where tiny word endings make
                all the difference in determining structure during translation?
              </p>

              <p className="font-serif text-[0.925rem] text-zinc-400 leading-[1.75] mb-5">
                As a high school senior at Belmont Hill having studied for 6 years, Brandon definitely was.
                So he built Syntaxis - a sleek, interactive tool for dissecting classical languages and
                connecting the dots so that studying the classics becomes <i>facilius</i> rather than <i>odiosius</i>
                It runs every query through UChicago's Logeion for reliable dictionary definitions, then
                uses AI to map out sentence architecture: nested clauses, prepositional phrases, case usages,
                and an English translation, all beautifully color-coded and dynamically interactive.

                <span className="text-zinc-600">Feedback: </span>
                <a href="mailto:libran@belmonthill.org" className="underline decoration-zinc-600 hover:text-zinc-400 transition-colors">libran@belmonthill.org</a>

                More to come soon.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
