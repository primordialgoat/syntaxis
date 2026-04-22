import { motion } from 'framer-motion';
import Nav from './Nav';
import Footer from './Footer';
import type { Route } from './routes';

interface Props {
  onNavigate: (route: Route) => void;
}

export default function About({ onNavigate }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className="min-h-screen"
    >
      <Nav currentRoute="about" onNavigate={onNavigate} />

      {/* ── Title ──────────────────────────────────────────────── */}
      <div className="max-w-[640px] mx-auto px-6 sm:px-10 pt-16 sm:pt-[72px]">
        <div
          className="font-sans text-[11px] uppercase mb-4"
          style={{ color: '#c9a84c', letterSpacing: '0.22em' }}
        >
          About
        </div>
        <h1
          className="font-serif text-[34px] sm:text-[44px] font-medium m-0 leading-[1.15]"
          style={{ color: '#eae3d4', letterSpacing: '-0.01em' }}
        >
          A tool for making sense
          <br />
          of the classics.
        </h1>
        <p
          className="mt-4 font-serif italic text-base"
          style={{ color: '#9a9284' }}
        >
          sententia clara fiat!
        </p>
      </div>

      {/* ── Body with gold left-border rule ─────────────────────── */}
      <div className="max-w-[640px] mx-auto px-6 sm:px-10 pt-12 pb-10">
        <div
          className="py-2.5"
          style={{
            paddingLeft: '32px',
            borderLeft: '3px solid rgba(201,168,76,0.45)',
          }}
        >
          <p
            className="font-serif text-[17px] leading-[1.75] mb-[26px] m-0"
            style={{ color: '#eae3d4' }}
          >
            <span
              className="float-left font-serif italic"
              style={{
                fontSize: '62px',
                lineHeight: 0.92,
                color: '#c9a84c',
                paddingRight: '10px',
                paddingTop: '6px',
              }}
            >
              T
            </span>
            ired of using clunky tools like Whitaker&rsquo;s Words to make sense of the classics?
            Wish there was a better way to understand beautiful languages like Latin and Ancient
            Greek, where tiny word endings make all the difference in translation?
          </p>

          <p
            className="font-serif text-[17px] leading-[1.75] mb-[26px]"
            style={{ color: '#9a9284' }}
          >
            As a six-year student of the classics at Belmont Hill School, Brandon Li &rsquo;26
            definitely was. So with the support of the BH classics department, he built Syntaxis —
            a sleek, interactive tool for dissecting classical languages and connecting the dots,
            so that studying the classics is <i>laetius</i> rather than <i>odiosius</i>, as it should be.
          </p>

          <p
            className="font-serif text-[17px] leading-[1.75] mb-[26px]"
            style={{ color: '#9a9284' }}
          >
            Every query runs through UChicago&rsquo;s Logeion for precise dictionary definitions, then
            advanced AI maps the sentence&rsquo;s architecture: nested clauses, prepositional phrases,
            case usages, and an optional English translation — all beautifully color-coded and
            dynamically interactive.
          </p>

          <p
            className="font-serif text-[17px] leading-[1.75] m-0"
            style={{ color: '#9a9284' }}
          >
            Whether learning for the first time, translating for coursework, or simply studying
            for the pure joy of it, Syntaxis provides a better way to make sense of the classics.
          </p>
        </div>

        {/* Contact */}
        <div
          className="mt-14 pt-7 font-sans text-[13px]"
          style={{
            borderTop: '1px solid rgba(201,168,76,0.1)',
            color: '#9a9284',
          }}
        >
          Comments &amp; feedback:{' '}
          <a
            href="mailto:lllenterprises68@gmail.com"
            style={{
              color: '#c9a84c',
              textDecoration: 'none',
              borderBottom: '1px solid rgba(201,168,76,0.3)',
            }}
          >
            lllenterprises68@gmail.com
          </a>
        </div>
      </div>

      <Footer onNavigate={onNavigate} />
    </motion.div>
  );
}
