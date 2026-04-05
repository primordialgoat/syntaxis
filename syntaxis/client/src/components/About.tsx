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

              <p className="font-serif text-[0.925rem] text-zinc-300 leading-[1.75] mb-5">
                Syntaxis was built because every existing tool for analyzing Latin stops at the dictionary entry.
              </p>

              <p className="font-serif text-[0.925rem] text-zinc-400 leading-[1.75] mb-5">
                Whitaker's Words tells you what a word <em>could</em> mean. Perseus gives you a parsing table.
                Neither tells you how words actually work together in a sentence — the clause structures,
                the case relationships, the flow of meaning through a periodic sentence.
              </p>

              <p className="font-serif text-[0.925rem] text-zinc-400 leading-[1.75] mb-5">
                Syntaxis does. It runs every query through UChicago's Logeion for dictionary data,
                then uses AI to map sentence architecture: nested clauses, prepositional phrases,
                syntactic roles, and an English translation — all color-coded and visual.
              </p>

              <p className="font-serif text-[0.925rem] text-zinc-500 leading-[1.75] mb-0">
                Built by Brandon Li, a Latin student
                at <a href="https://www.belmonthill.org" target="_blank" rel="noopener noreferrer" className="underline decoration-zinc-600 hover:text-zinc-400 transition-colors">Belmont Hill School</a>,
                as the first piece of something bigger. More soon.
                <br />
                <span className="text-zinc-600">Feedback: </span>
                <a href="mailto:libran@belmonthill.org" className="underline decoration-zinc-600 hover:text-zinc-400 transition-colors">libran@belmonthill.org</a>
              </p>

            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
