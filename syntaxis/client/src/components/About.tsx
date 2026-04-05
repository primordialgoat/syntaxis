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
            {/* Inner content card with amber left border */}
            <div
              className="mt-6 w-full max-w-[640px] py-5 sm:py-6 pl-5 sm:pl-7 pr-3"
              style={{ borderLeft: '3px solid rgba(201,168,76,0.45)' }}
            >

              {/* ABOUT CONTENT — EDIT BELOW */}

              <p className="font-serif text-[0.925rem] text-zinc-400 leading-[1.75] mb-6">
                Syntaxis was designed by Brandon Li, a senior at Belmont Hill and longtime classics student, who was frustrated by the lack of a better tool
                for analyzing classical languages on the Internet. He built Syntaxis as an interactive tool to help him with these ancient languages,
                which are unique among others in that they heavily rely on word endings and structural precision to determine meaning. 
                
                With every user query, Syntaxis first conducts a dictionary lookup from UChicago's Logeion to find word definitions, <u>then goes beyond
                popular tools like Whitaker's Words and Perseus by using AI to generate advanced analytics regarding sentence flow, case usages, and nested clauses.</u>

                Syntaxis is a better way to understand classical languages, built by students for students. Happy translating!

                Please send feedback, suggestions, and comments to libran@belmonthill.org.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
