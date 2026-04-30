import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import posthog from 'posthog-js';

// ─── Types ────────────────────────────────────────────────────────────────────

type ClauseType =
  | 'main'
  | 'subordinate'
  | 'indirect_discourse'
  | 'relative'
  | 'participial';

interface Morphology {
  case?: string;
  number?: string;
  gender?: string;
  caseUsage?: string;
  person?: string;
  tense?: string;
  mood?: string;
  voice?: string;
  modifies?: string;
}

interface Word {
  id: string;
  text: string;
  lemma: string;
  role: string;
  partOfSpeech: string;
  morphology?: Morphology;
  translation: string;
  relatedWords: string[];
}

interface Group {
  id: string;
  type: string;
  label: string;
  wordIds: string[];
}

interface Clause {
  id: string;
  parentId?: string | null;
  type: ClauseType;
  level: number;
  label: string;
  words: Word[];
  groups: Group[];
  translation: string;
}

export interface AnalysisResult {
  original: string;
  clauses: Clause[];
  fullTranslation: string;
}

// ─── Style Config ─────────────────────────────────────────────────────────────

const CLAUSE_STYLES: Record<
  ClauseType,
  { bg: string; badge: string; dot: string; lineColor: string }
> = {
  main:               { bg: 'bg-blue-950/25',   badge: 'bg-blue-500/15 text-blue-300 border border-blue-500/30',   dot: 'bg-blue-400',   lineColor: '#3b82f6' },
  subordinate:        { bg: 'bg-purple-950/25',  badge: 'bg-purple-500/15 text-purple-300 border border-purple-500/30', dot: 'bg-purple-400', lineColor: '#a855f7' },
  indirect_discourse: { bg: 'bg-amber-950/25',   badge: 'bg-amber-500/15 text-amber-300 border border-amber-500/30',   dot: 'bg-amber-400',  lineColor: '#f59e0b' },
  relative:           { bg: 'bg-green-950/25',   badge: 'bg-green-500/15 text-green-300 border border-green-500/30',   dot: 'bg-green-400',  lineColor: '#22c55e' },
  participial:        { bg: 'bg-rose-950/25',    badge: 'bg-rose-500/15 text-rose-300 border border-rose-500/30',     dot: 'bg-rose-400',   lineColor: '#f43f5e' },
};

// Hex colors match Tailwind's palette for use in inline styles
const ROLE_STYLES: Record<
  string,
  { text: string; bg: string; color: string; label: string; short: string }
> = {
  subject:              { text: 'text-yellow-300',  bg: 'bg-yellow-300/10',  color: '#fde047', label: 'Subject',           short: 'subject'      },
  verb:                 { text: 'text-red-400',     bg: 'bg-red-400/10',     color: '#f87171', label: 'Verb',              short: 'verb'         },
  direct_object:        { text: 'text-green-300',   bg: 'bg-green-300/10',   color: '#86efac', label: 'Direct Object',     short: 'direct obj.'  },
  indirect_object:      { text: 'text-teal-300',    bg: 'bg-teal-300/10',    color: '#5eead4', label: 'Indirect Object',   short: 'indir. obj.'  },
  adj:                  { text: 'text-purple-300',  bg: 'bg-purple-300/10',  color: '#d8b4fe', label: 'Adjectival',        short: 'adj.'         },
  adv:                  { text: 'text-violet-300',  bg: 'bg-violet-300/10',  color: '#c4b5fd', label: 'Adverbial',         short: 'adv.'         },
  preposition:          { text: 'text-gray-400',    bg: 'bg-gray-400/10',    color: '#9ca3af', label: 'Preposition',       short: 'prep.'        },
  conjunction:          { text: 'text-gray-500',    bg: 'bg-gray-500/10',    color: '#6b7280', label: 'Conjunction',       short: 'conj.'        },
  predicate_nominative: { text: 'text-orange-300',  bg: 'bg-orange-300/10',  color: '#fdba74', label: 'Pred. Nominative',  short: 'pred. nom.'   },
  predicate_adjective:  { text: 'text-orange-200',  bg: 'bg-orange-200/10',  color: '#fed7aa', label: 'Pred. Adjective',   short: 'pred. adj.'   },
  vocative:             { text: 'text-pink-300',    bg: 'bg-pink-300/10',    color: '#f9a8d4', label: 'Vocative',          short: 'vocative'     },
  other:                { text: 'text-zinc-400',    bg: 'bg-zinc-400/10',    color: '#a1a1aa', label: 'Other',             short: 'other'        },
};

const GROUP_PALETTE = [
  { color: '#fb923c', badgeClass: 'text-orange-200 bg-orange-400/10 border-orange-400/30' },
  { color: '#22d3ee', badgeClass: 'text-cyan-200 bg-cyan-400/10 border-cyan-400/30' },
  { color: '#a3e635', badgeClass: 'text-lime-200 bg-lime-400/10 border-lime-400/30' },
  { color: '#f472b6', badgeClass: 'text-pink-200 bg-pink-400/10 border-pink-400/30' },
  { color: '#a78bfa', badgeClass: 'text-violet-200 bg-violet-400/10 border-violet-400/30' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const TRANSLATION_STORAGE_KEY = 'syntaxis:show-translation';

function useShowTranslation(): [boolean, () => void] {
  const [show, setShow] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem(TRANSLATION_STORAGE_KEY);
      return stored === null ? true : stored === 'true';
    } catch {
      return true;
    }
  });

  const toggle = useCallback(() => {
    setShow((v) => {
      const next = !v;
      try { localStorage.setItem(TRANSLATION_STORAGE_KEY, String(next)); } catch { /* ignore */ }
      return next;
    });
  }, []);

  return [show, toggle];
}

function cap(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, ' ');
}

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(
    typeof window !== 'undefined' && window.innerWidth < 640,
  );
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640);
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);
  return isMobile;
}

// ─── WordTooltip ──────────────────────────────────────────────────────────────

function WordTooltip({ word }: { word: Word }) {
  const m = word.morphology ?? {};

  const morphRows: [string, string][] = (
    [
      m.person ? ['Person', m.person]      : null,
      m.tense  ? ['Tense',  cap(m.tense)]  : null,
      m.mood   ? ['Mood',   cap(m.mood)]   : null,
      m.voice  ? ['Voice',  cap(m.voice)]  : null,
      m.case   ? ['Case',   cap(m.case)]   : null,
      m.number ? ['Number', cap(m.number)] : null,
      m.gender ? ['Gender', cap(m.gender)] : null,
    ] as ([string, string] | null)[]
  ).filter(Boolean) as [string, string][];

  return (
    <div className="w-60 sm:w-68 rounded-2xl border border-zinc-700/80 bg-[#131318] shadow-2xl p-4 text-left pointer-events-none">
      {/* Word + lemma */}
      <div className="flex items-baseline gap-2 mb-2">
        <span className="font-serif text-xl text-zinc-100 leading-tight">{word.text}</span>
        <span className="font-serif text-sm text-zinc-500 italic">{word.lemma}</span>
      </div>

      {/* POS badge */}
      <span className="inline-block text-[11px] px-2 py-0.5 rounded-full bg-zinc-800 border border-zinc-700 text-zinc-400 mb-3 font-sans">
        {cap(word.partOfSpeech)}
      </span>

      {/* Morphology grid */}
      {morphRows.length > 0 && (
        <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-[5px] mb-3">
          {morphRows.map(([label, value]) => (
            <div key={label} className="contents">
              <span className="text-[11px] text-zinc-500 font-sans">{label}</span>
              <span className="text-[11px] text-zinc-200 font-sans">{value}</span>
            </div>
          ))}
        </div>
      )}

      {/* Case usage */}
      {m.caseUsage && (
        <div className="text-[11px] text-amber-300 bg-amber-950/50 border border-amber-700/40 rounded-lg px-2.5 py-1 mb-2 font-sans">
          {m.caseUsage}
        </div>
      )}

      {/* Modifies */}
      {m.modifies && (
        <div className="text-[11px] text-zinc-400 font-sans mb-2">
          Modifies: <span className="font-serif text-zinc-200 not-italic">{m.modifies}</span>
        </div>
      )}

      {/* Translation */}
      <div className="text-xs italic text-zinc-400 font-serif border-t border-zinc-700/50 pt-2 mt-1">
        &ldquo;{word.translation}&rdquo;
      </div>
    </div>
  );
}

// ─── WordToken ────────────────────────────────────────────────────────────────

interface WordTokenProps {
  word: Word;
  groupColor?: string;
  isGroupHighlighted: boolean;
  isRelatedHighlighted: boolean;
  onWordHover: () => void;
  onWordUnhover: () => void;
  isMobile: boolean;
}

function WordToken({
  word,
  groupColor,
  isGroupHighlighted,
  isRelatedHighlighted,
  onWordHover,
  onWordUnhover,
  isMobile,
}: WordTokenProps) {
  const [hovered, setHovered] = useState(false);
  const rs = ROLE_STYLES[word.role] ?? ROLE_STYLES.other;
  const inspectTimerRef = useRef<number | null>(null);

  const handleHoverStart = useCallback(() => {
    setHovered(true);
    onWordHover();
    if (inspectTimerRef.current !== null) {
      window.clearTimeout(inspectTimerRef.current);
    }
    inspectTimerRef.current = window.setTimeout(() => {
      posthog.capture('word_inspected', {
        word: word.text,
        lemma: word.lemma,
        partOfSpeech: word.partOfSpeech,
        role: word.role,
      });
      inspectTimerRef.current = null;
    }, 1000);
  }, [onWordHover, word.text, word.lemma, word.partOfSpeech, word.role]);

  const handleHoverEnd = useCallback(() => {
    setHovered(false);
    onWordUnhover();
    if (inspectTimerRef.current !== null) {
      window.clearTimeout(inspectTimerRef.current);
      inspectTimerRef.current = null;
    }
  }, [onWordUnhover]);

  useEffect(() => {
    return () => {
      if (inspectTimerRef.current !== null) {
        window.clearTimeout(inspectTimerRef.current);
      }
    };
  }, []);

  // The bottom-border color is the group color if in a highlighted group, otherwise role color
  const bottomColor = groupColor ?? rs.color;

  // Box-shadow for related / group highlights
  const shadowValue = isRelatedHighlighted
    ? `0 0 0 2px ${rs.color}88, 0 0 16px 3px ${rs.color}22`
    : isGroupHighlighted && groupColor
    ? `0 0 0 2px ${groupColor}55, 0 0 12px 2px ${groupColor}22`
    : 'none';

  // Tooltip placement
  const tooltipClass = isMobile
    ? 'absolute top-[calc(100%+10px)] left-1/2 -translate-x-1/2 z-50'
    : 'absolute bottom-[calc(100%+10px)] left-1/2 -translate-x-1/2 z-50';

  const tooltipMotion = isMobile
    ? { initial: { opacity: 0, y: -6, scale: 0.97 }, animate: { opacity: 1, y: 0, scale: 1 }, exit: { opacity: 0, y: -6, scale: 0.97 } }
    : { initial: { opacity: 0, y: 6,  scale: 0.97 }, animate: { opacity: 1, y: 0, scale: 1 }, exit: { opacity: 0, y: 6,  scale: 0.97 } };

  return (
    /* Outer: stacks chip + role label vertically */
    <div className="flex flex-col items-center gap-[5px]">

      {/* Inner: relative anchor for tooltip */}
      <div className="relative">
        <motion.button
          onHoverStart={handleHoverStart}
          onHoverEnd={handleHoverEnd}
          animate={{ boxShadow: shadowValue }}
          transition={{ duration: 0.15 }}
          style={{
            // Neutral thin border on three sides, role-colored 2px bottom accent
            border: '1px solid rgba(82,82,91,0.45)',
            borderBottomWidth: '2px',
            borderBottomStyle: 'solid',
            borderBottomColor: bottomColor,
          }}
          className={[
            'px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg font-serif',
            'text-sm sm:text-base leading-snug',
            'cursor-default select-none transition-[filter] duration-100',
            rs.text,
            rs.bg,
            hovered ? 'brightness-125' : '',
          ].join(' ')}
        >
          {word.text}
        </motion.button>

        {/* Tooltip */}
        <AnimatePresence>
          {hovered && (
            <motion.div
              {...tooltipMotion}
              transition={{ duration: 0.13, ease: 'easeOut' }}
              className={tooltipClass}
            >
              <WordTooltip word={word} />
              {isMobile ? (
                <div className="absolute left-1/2 -translate-x-1/2 -top-[6px]"
                  style={{ width: 0, height: 0, borderLeft: '7px solid transparent', borderRight: '7px solid transparent', borderBottom: '7px solid #131318' }} />
              ) : (
                <div className="absolute left-1/2 -translate-x-1/2 -bottom-[6px]"
                  style={{ width: 0, height: 0, borderLeft: '7px solid transparent', borderRight: '7px solid transparent', borderTop: '7px solid #131318' }} />
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Role label beneath the chip */}
      <span className="text-[9px] sm:text-[10px] font-sans uppercase tracking-wider text-zinc-500 select-none leading-none">
        {rs.short}
      </span>
    </div>
  );
}

// ─── TranslationDivider ──────────────────────────────────────────────────────

function TranslationDivider({ show, onToggle }: { show: boolean; onToggle: () => void }) {
  return (
    <div className="flex items-center gap-3 my-6">
      <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.08)' }} />
      <button
        onClick={onToggle}
        className="flex items-center gap-1.5 text-xs font-sans px-3 py-[5px] rounded-full border border-zinc-800/80 bg-[#0f0f13] text-zinc-600 hover:text-zinc-400 hover:border-zinc-700/60 transition-all duration-150 select-none shrink-0"
      >
        {show ? 'Hide Translation' : 'Show Translation'}
      </button>
      <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.08)' }} />
    </div>
  );
}

// ─── TranslationCopyButton ───────────────────────────────────────────────────

function TranslationCopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* ignore */ }
  };

  return (
    <button
      onClick={handleCopy}
      title="Copy translation"
      className="absolute top-4 right-4 p-1 rounded text-zinc-700 hover:text-zinc-500 transition-colors duration-150"
    >
      {copied ? (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5 text-green-500/70">
          <path fillRule="evenodd" d="M12.416 3.376a.75.75 0 0 1 .208 1.04l-5 7.5a.75.75 0 0 1-1.154.114l-3-3a.75.75 0 0 1 1.06-1.06l2.353 2.353 4.493-6.74a.75.75 0 0 1 1.04-.207Z" clipRule="evenodd" />
        </svg>
      ) : (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5">
          <path fillRule="evenodd" d="M11.986 3H12a2 2 0 0 1 2 2v6a2 2 0 0 1-1.5 1.937V7A2.5 2.5 0 0 0 10 4.5H4.063A2 2 0 0 1 6 3h.014A2.25 2.25 0 0 1 8.25 1h1.5a2.25 2.25 0 0 1 2.236 2ZM10.5 4v-.175a.75.75 0 0 0-.75-.75h-1.5a.75.75 0 0 0-.75.75V4h3Z" clipRule="evenodd" />
          <path d="M3 6a1 1 0 0 0-1 1v7a1 1 0 0 0 1 1h7a1 1 0 0 0 1-1V7a1 1 0 0 0-1-1H3Z" />
        </svg>
      )}
    </button>
  );
}

// ─── ClauseCard ───────────────────────────────────────────────────────────────

interface ClauseCardProps {
  clause: Clause;
  hoveredWordId: string | null;
  setHoveredWordId: (id: string | null) => void;
  wordMap: Map<string, Word>;
  isMobile: boolean;
  showTranslation: boolean;
}

function ClauseCard({
  clause,
  hoveredWordId,
  setHoveredWordId,
  wordMap,
  isMobile,
  showTranslation,
}: ClauseCardProps) {
  const [hoveredGroupId, setHoveredGroupId] = useState<string | null>(null);
  const cs = CLAUSE_STYLES[clause.type] ?? CLAUSE_STYLES.subordinate;
  const indent = clause.level * (isMobile ? 12 : 36);

  // Streaming partials may emit a clause before its words/groups arrive.
  // Default to empty arrays so the renderer never crashes mid-stream.
  const clauseWords = clause.words ?? [];
  const clauseGroups = clause.groups ?? [];

  // Word → group maps
  const wordToGroupIdx = new Map<string, number>();
  const wordToGroupId  = new Map<string, string>();
  clauseGroups.forEach((group, i) => {
    (group.wordIds ?? []).forEach((wid) => {
      wordToGroupIdx.set(wid, i % GROUP_PALETTE.length);
      wordToGroupId.set(wid, group.id);
    });
  });

  // Related words of whatever is currently hovered
  const relatedIds = new Set(
    hoveredWordId ? (wordMap.get(hoveredWordId)?.relatedWords ?? []) : [],
  );

  return (
    <div className="relative mb-4">
      {/* ── Connector for indented clauses ─────────────────────── */}
      {clause.level > 0 && (
        <>
          <div
            className="absolute top-0 bottom-0 w-px"
            style={{
              left: `${indent - (isMobile ? 7 : 18)}px`,
              background: `linear-gradient(to bottom, transparent 0%, ${cs.lineColor}38 20px, ${cs.lineColor}38 calc(100% - 20px), transparent 100%)`,
            }}
          />
          <div
            className="absolute w-2 h-2 rounded-full"
            style={{
              left: `${indent - (isMobile ? 11 : 22)}px`,
              top: '22px',
              backgroundColor: cs.lineColor,
              boxShadow: `0 0 8px ${cs.lineColor}50`,
              outline: `2.5px solid #0f0f13`,
            }}
          />
        </>
      )}

      {/* ── Card ───────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        style={{
          marginLeft: `${indent}px`,
          // Subtle colored border on all sides, thick colored left accent
          border: `1px solid ${cs.lineColor}28`,
          borderLeft: `4px solid ${cs.lineColor}`,
          borderRadius: '14px',
        }}
        className={['p-5 sm:p-7', cs.bg].join(' ')}
      >
        {/* Badge */}
        <div
          className={[
            'inline-flex items-center gap-2 text-xs sm:text-sm font-sans font-medium',
            'px-3 py-1.5 rounded-full mb-4 sm:mb-5',
            cs.badge,
          ].join(' ')}
        >
          <span className={['w-2 h-2 rounded-full shrink-0', cs.dot].join(' ')} />
          {clause.label}
        </div>

        {/* Word tokens */}
        <div className="flex flex-wrap gap-3 sm:gap-4 items-start">
          {clauseWords.map((word) => {
            const gIdx = wordToGroupIdx.get(word.id);
            const gId  = wordToGroupId.get(word.id);
            return (
              <WordToken
                key={word.id}
                word={word}
                groupColor={gIdx !== undefined ? GROUP_PALETTE[gIdx].color : undefined}
                isGroupHighlighted={hoveredGroupId !== null && gId === hoveredGroupId}
                isRelatedHighlighted={relatedIds.has(word.id)}
                onWordHover={() => setHoveredWordId(word.id)}
                onWordUnhover={() => setHoveredWordId(null)}
                isMobile={isMobile}
              />
            );
          })}
        </div>

        {/* Group labels */}
        {clauseGroups.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-4">
            {clauseGroups.map((group, i) => {
              const palette  = GROUP_PALETTE[i % GROUP_PALETTE.length];
              const isActive = hoveredGroupId === group.id;
              return (
                <button
                  key={group.id}
                  onMouseEnter={() => setHoveredGroupId(group.id)}
                  onMouseLeave={() => setHoveredGroupId(null)}
                  className={[
                    'text-[11px] px-2 py-0.5 rounded border font-sans cursor-default',
                    'transition-opacity duration-100',
                    palette.badgeClass,
                    isActive ? 'opacity-100' : 'opacity-45 hover:opacity-75',
                  ].join(' ')}
                  style={{ borderColor: palette.color + '45' }}
                >
                  {group.label}
                </button>
              );
            })}
          </div>
        )}

        {/* Clause translation — visually separated */}
        <AnimatePresence initial={false}>
          {showTranslation && (
            <motion.div
              key="clause-tr"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.22, ease: 'easeInOut' }}
              className="overflow-hidden"
            >
              <div className="mt-4 sm:mt-5 pt-3 sm:pt-4 border-t border-white/5">
                <p className="font-serif italic text-zinc-300 text-sm sm:text-base leading-relaxed">
                  {clause.translation}
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}

// ─── ShareButton ──────────────────────────────────────────────────────────────

function ShareButton({ result }: { result: AnalysisResult }) {
  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
    const text = `${result.original}\n\n"${result.fullTranslation}"\n\n— analyzed with Syntaxis`;
    try {
      if (typeof navigator !== 'undefined' && 'share' in navigator) {
        try {
          await (navigator as Navigator & { share: (d: ShareData) => Promise<void> }).share({
            title: 'Syntaxis analysis',
            text,
          });
          posthog.capture('analysis_shared', { method: 'native_share' });
          return;
        } catch {
          /* fall through to clipboard */
        }
      }
      await navigator.clipboard.writeText(text);
      posthog.capture('analysis_shared', { method: 'clipboard' });
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  };

  return (
    <button
      onClick={handleShare}
      className="flex items-center gap-1.5 py-1.5 px-3 rounded-full cursor-pointer font-sans text-xs font-medium transition-colors duration-150 bg-transparent"
      style={{
        color: copied ? '#e0b95a' : '#c9a84c',
        border: '1px solid rgba(201,168,76,0.3)',
        letterSpacing: '0.01em',
      }}
    >
      {copied ? (
        <>
          <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 8.5l3.5 3.5L13 4.5" />
          </svg>
          Copied ✓
        </>
      ) : (
        <>
          <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
            <path d="M8 10V2M8 2L5 5M8 2l3 3M3 9v4a1 1 0 001 1h8a1 1 0 001-1V9" />
          </svg>
          Share this analysis
        </>
      )}
    </button>
  );
}

// ─── Clause ordering ──────────────────────────────────────────────────────────

// Earliest word index for a clause, derived from the numeric suffix of word ids
// (the prompt emits word_1, word_2, … in linear sentence order). Used to sort
// siblings so cards render in the same order their words appear in the Latin.
function firstWordPosition(clause: Clause): number {
  let min = Infinity;
  for (const w of clause.words) {
    const m = w.id.match(/\d+/);
    if (m) {
      const n = parseInt(m[0], 10);
      if (n < min) min = n;
    }
  }
  return min === Infinity ? 0 : min;
}

// Build a parent → children tree from the flat clauses array, sort siblings by
// first-word position, and DFS-flatten so children render immediately after
// their parent. Defends against orphans (parentId points nowhere) and cycles.
function orderClausesForRendering(clauses: Clause[]): Clause[] {
  const idSet = new Set(clauses.map((c) => c.id));
  const childrenByParent = new Map<string, Clause[]>();
  const topLevel: Clause[] = [];

  for (const clause of clauses) {
    const parentId = clause.parentId;
    if (parentId && idSet.has(parentId)) {
      const arr = childrenByParent.get(parentId) ?? [];
      arr.push(clause);
      childrenByParent.set(parentId, arr);
    } else {
      // No parentId, or parentId points to a non-existent clause: treat as top-level.
      topLevel.push(clause);
    }
  }

  const sortByPos = (a: Clause, b: Clause) =>
    firstWordPosition(a) - firstWordPosition(b);
  topLevel.sort(sortByPos);
  for (const arr of childrenByParent.values()) arr.sort(sortByPos);

  const ordered: Clause[] = [];
  const visited = new Set<string>();
  function visit(clause: Clause) {
    if (visited.has(clause.id)) return;
    visited.add(clause.id);
    ordered.push(clause);
    for (const child of childrenByParent.get(clause.id) ?? []) visit(child);
  }
  for (const c of topLevel) visit(c);

  // Catch any clauses that were unreachable from top-level (e.g. a parentId
  // cycle that dropped them). Append them so nothing is silently lost.
  for (const c of clauses) if (!visited.has(c.id)) ordered.push(c);

  return ordered;
}

// ─── StreamingIndicator ───────────────────────────────────────────────────────
//
// Shown beneath the rendered cards while the analysis stream is still arriving,
// so the user knows more cards are on the way. Three pulsing gold dots + an
// italic message in the same serif/amber palette as the loading skeleton.

function StreamingIndicator() {
  return (
    <div className="flex items-center justify-center gap-3 my-8">
      <div className="flex gap-1.5">
        {[0, 0.18, 0.36].map((delay, i) => (
          <motion.div
            key={i}
            className="w-1.5 h-1.5 rounded-full"
            style={{ backgroundColor: '#c9a84c' }}
            animate={{ opacity: [0.25, 1, 0.25] }}
            transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut', delay }}
          />
        ))}
      </div>
      <p
        className="font-serif italic text-sm"
        style={{ color: '#a89070' }}
      >
        Analyzing the rest of the sentence…
      </p>
    </div>
  );
}

// ─── SentenceAnalysis ─────────────────────────────────────────────────────────

interface Props {
  result: AnalysisResult;
  isStreaming?: boolean;
}

export default function SentenceAnalysis({ result, isStreaming = false }: Props) {
  const isMobile = useIsMobile();
  const [hoveredWordId, setHoveredWordId] = useState<string | null>(null);
  const [showTranslation, toggleTranslation] = useShowTranslation();

  // Defer mounting the streaming indicator by 400ms so that fast paths (cache
  // hits, ~100ms) don't show a brief flicker of "Analyzing the rest…" before
  // the stream finishes.
  const [showStreamingIndicator, setShowStreamingIndicator] = useState(false);
  useEffect(() => {
    if (!isStreaming) {
      setShowStreamingIndicator(false);
      return;
    }
    const timer = window.setTimeout(() => setShowStreamingIndicator(true), 400);
    return () => window.clearTimeout(timer);
  }, [isStreaming]);

  const handleToggleTranslation = useCallback(() => {
    posthog.capture('translation_toggled', {
      new_state: showTranslation ? 'hidden' : 'visible',
    });
    toggleTranslation();
  }, [showTranslation, toggleTranslation]);

  // Global word map across all clauses (for related-word highlighting).
  // Streaming partials may not have populated all clauses/words yet — guard.
  const clauses = result.clauses ?? [];
  const wordMap = new Map<string, Word>();
  for (const clause of clauses) {
    for (const word of clause.words ?? []) {
      wordMap.set(word.id, word);
    }
  }

  const orderedClauses = orderClausesForRendering(clauses);

  return (
    <div className="max-w-[900px] mx-auto px-3 sm:px-6 py-8 sm:py-12">

      {/* ── Original sentence ────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="relative text-center mb-8 sm:mb-10"
      >
        <div
          className="font-sans text-[10.5px] uppercase mb-3"
          style={{ color: '#6e6558', letterSpacing: '0.22em' }}
        >
          Analyzing
        </div>
        <p className="font-serif text-xl sm:text-2xl text-zinc-100 tracking-wide leading-relaxed">
          {result.original}
        </p>
        <div className="mt-3 h-px w-20 mx-auto" style={{ background: 'rgba(201,168,76,0.3)' }} />

        {/* Share button — absolute top-right on sm+, stacked below on mobile */}
        <div className="hidden sm:block absolute top-0 right-0">
          <ShareButton result={result} />
        </div>
        <div className="sm:hidden flex justify-center mt-4">
          <ShareButton result={result} />
        </div>
      </motion.div>

      {/* ── Clause cards ─────────────────────────────────────── */}
      <div>
        {orderedClauses.map((clause) => (
          <ClauseCard
            key={clause.id}
            clause={clause}
            hoveredWordId={hoveredWordId}
            setHoveredWordId={setHoveredWordId}
            wordMap={wordMap}
            isMobile={isMobile}
            showTranslation={showTranslation}
          />
        ))}
      </div>

      {/* ── Streaming indicator (shown while more cards are still arriving)
             cross-fades with the translation section below ──────────── */}
      <AnimatePresence mode="wait">
        {showStreamingIndicator ? (
          <motion.div
            key="streaming"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
          >
            <StreamingIndicator />
          </motion.div>
        ) : (
          <motion.div
            key="post-stream"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
          >
            {/* Translation divider toggle */}
            <TranslationDivider show={showTranslation} onToggle={handleToggleTranslation} />

            {/* English translation bar — only render when fullTranslation is present */}
            <AnimatePresence>
              {showTranslation && result.fullTranslation && (
                <motion.div
                  key="full-tr"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 6 }}
                  transition={{ duration: 0.3, ease: 'easeInOut' }}
                  className="relative flex overflow-hidden rounded-2xl border border-zinc-700/30 bg-zinc-900/50 mb-10"
                >
            {/* Thick amber left accent */}
            <div className="w-[5px] shrink-0 bg-amber-500" />
            <div className="px-5 sm:px-8 py-5 sm:py-6 flex-1">
              <p className="text-[11px] font-sans font-medium text-zinc-500 uppercase tracking-[0.12em] mb-2.5">
                English Translation
              </p>
              <p className="font-serif italic text-zinc-100 text-lg sm:text-xl leading-relaxed">
                &ldquo;{result.fullTranslation}&rdquo;
              </p>
            </div>
            <TranslationCopyButton text={result.fullTranslation} />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
