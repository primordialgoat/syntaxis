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

              <h2 className="font-sans text-[10px] font-semibold uppercase tracking-[0.2em] text-amber-500/80 mb-3">
                About Syntaxis
              </h2>
              <p className="font-serif text-[0.925rem] text-zinc-400 leading-[1.75] mb-6">
                [Mission statement paragraph]
              </p>

              <h3 className="font-sans text-[10px] font-semibold uppercase tracking-[0.2em] text-amber-500/80 mb-3">
                Who is this for?
              </h3>
              <p className="font-serif text-[0.925rem] text-zinc-400 leading-[1.75] mb-6">
                [Audience description paragraph]
              </p>

              <h3 className="font-sans text-[10px] font-semibold uppercase tracking-[0.2em] text-amber-500/80 mb-3">
                How it works
              </h3>
              <p className="font-serif text-[0.925rem] text-zinc-400 leading-[1.75] mb-6">
                [Tool explanation paragraph]
              </p>

              <h3 className="font-sans text-[10px] font-semibold uppercase tracking-[0.2em] text-amber-500/80 mb-3">
                Contact
              </h3>
              <p className="font-serif text-[0.925rem] text-zinc-400 leading-[1.75]">
                [Contact information]
              </p>

              {/* END ABOUT CONTENT */}

            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
