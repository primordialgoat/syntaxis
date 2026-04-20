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
  morphology: Morphology;
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
  { bgColor: string; badgeClass: string; dot: string; lineColor: string }
> = {
  main:               { bgColor: '#f4f6fb', badgeClass: 'bg-[#e8edf8] text-[#2f5d8a] border border-[#2f5d8a]/30',  dot: 'bg-[#2f5d8a]',  lineColor: '#2f5d8a' },
  subordinate:        { bgColor: '#f5f0ff', badgeClass: 'bg-[#ede6ff] text-[#6d44a3] border border-[#6d44a3]/30',  dot: 'bg-[#6d44a3]',  lineColor: '#6d44a3' },
  indirect_discourse: { bgColor: '#fdf6e3', badgeClass: 'bg-[#fdf0d0] text-[#8b5412] border border-[#b8791f]/30',  dot: 'bg-[#b8791f]',  lineColor: '#b8791f' },
  relative:           { bgColor: '#f0f8f0', badgeClass: 'bg-[#e4f4e4] text-[#2d7a2d] border border-[#4a8b4a]/30',  dot: 'bg-[#4a8b4a]',  lineColor: '#4a8b4a' },
  participial:        { bgColor: '#fdf2ee', badgeClass: 'bg-[#fce8e0] text-[#8c3f0f] border border-[#c0633a]/30',  dot: 'bg-[#c0633a]',  lineColor: '#c0633a' },
};

const ROLE_STYLES: Record<
  string,
  { color: string; labelColor: string; label: string; short: string }
> = {
  subject:              { color: '#c9a227', labelColor: '#8a6d12', label: 'Subject',           short: 'subject'     },
  verb:                 { color: '#b94a48', labelColor: '#873735', label: 'Verb',              short: 'verb'        },
  direct_object:        { color: '#2f8a5c', labelColor: '#1f6a44', label: 'Direct Object',     short: 'direct obj.' },
  indirect_object:      { color: '#2a7a7a', labelColor: '#1a5555', label: 'Indirect Object',   short: 'indir. obj.' },
  modifier:             { color: '#7b4aa3', labelColor: '#5b3280', label: 'Modifier',          short: 'modifier'    },
  preposition:          { color: '#6b6b6b', labelColor: '#5a5a5a', label: 'Preposition',       short: 'prep.'       },
  conjunction:          { color: '#888888', labelColor: '#666666', label: 'Conjunction',       short: 'conj.'       },
  predicate_nominative: { color: '#b85a1a', labelColor: '#8c3f0f', label: 'Pred. Nominative',  short: 'pred. nom.'  },
  predicate_adjective:  { color: '#d07832', labelColor: '#a05818', label: 'Pred. Adjective',   short: 'pred. adj.'  },
  vocative:             { color: '#b05080', labelColor: '#8a3060', label: 'Vocative',          short: 'vocative'    },
  other:                { color: '#9c8a72', labelColor: '#7a6a52', label: 'Other',             short: 'other'       },
};

const GROUP_PALETTE = [
  { color: '#b85a1a', badgeClass: 'text-[#8c3f0f] bg-orange-50 border-orange-200' },
  { color: '#2f5d8a', badgeClass: 'text-[#1d3d5e] bg-blue-50   border-blue-200'   },
  { color: '#4a8b4a', badgeClass: 'text-[#2d5a2d] bg-green-50  border-green-200'  },
  { color: '#6d44a3', badgeClass: 'text-[#4a2d7a] bg-purple-50 border-purple-200' },
  { color: '#8a2e3b', badgeClass: 'text-[#5e1f28] bg-rose-50   border-rose-200'   },
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
  const m = word.morphology;

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
    <div
      className="w-56 rounded-xl p-4 text-left pointer-events-none"
      style={{
        background: '#2a231a',
        border: '1px solid rgba(255,255,255,0.1)',
        boxShadow: '0 16px 30px -12px rgba(0,0,0,.45)',
      }}
    >
      {/* Word + lemma */}
      <div className="flex items-baseline gap-2 mb-2">
        <span className="font-fraunces text-xl italic leading-tight" style={{ color: '#ffffff' }}>
          {word.text}
        </span>
        <span className="font-serif text-sm italic" style={{ color: '#a89070' }}>
          {word.lemma}
        </span>
      </div>

      {/* POS badge */}
      <span
        className="inline-block text-[11px] px-2 py-0.5 rounded-full mb-3 font-sans"
        style={{ background: 'rgba(255,255,255,0.1)', color: '#c8b896', border: '1px solid rgba(255,255,255,0.15)' }}
      >
        {cap(word.partOfSpeech)}
      </span>

      {/* Morphology grid */}
      {morphRows.length > 0 && (
        <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-[5px] mb-3">
          {morphRows.map(([label, value]) => (
            <div key={label} className="contents">
              <span className="text-[11px] font-sans" style={{ color: '#8a7a62' }}>{label}</span>
              <span className="text-[11px] font-sans" style={{ color: '#f0e4cc' }}>{value}</span>
            </div>
          ))}
        </div>
      )}

      {/* Case usage */}
      {m.caseUsage && (
        <div
          className="text-[11px] rounded-lg px-2.5 py-1 mb-2 font-sans"
          style={{ color: '#f4c86a', background: 'rgba(201,168,76,0.15)', border: '1px solid rgba(201,168,76,0.3)' }}
        >
          {m.caseUsage}
        </div>
      )}

      {/* Modifies */}
      {m.modifies && (
        <div className="text-[11px] font-sans mb-2" style={{ color: '#a89070' }}>
          Modifies: <span className="font-fraunces italic" style={{ color: '#f0e4cc' }}>{m.modifies}</span>
        </div>
      )}

      {/* Translation */}
      <div
        className="text-xs italic font-serif border-t pt-2 mt-1"
        style={{ color: '#c8b896', borderColor: 'rgba(255,255,255,0.1)' }}
      >
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
    if (inspectTimerRef.current !== null) window.clearTimeout(inspectTimerRef.current);
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
      if (inspectTimerRef.current !== null) window.clearTimeout(inspectTimerRef.current);
    };
  }, []);

  const bottomColor = groupColor ?? rs.color;

  const shadowValue = isRelatedHighlighted
    ? `0 0 0 2px ${rs.color}66, 0 0 14px 2px ${rs.color}22`
    : isGroupHighlighted && groupColor
    ? `0 0 0 2px ${groupColor}44, 0 0 10px 2px ${groupColor}18`
    : 'none';

  const tooltipClass = isMobile
    ? 'absolute top-[calc(100%+10px)] left-1/2 -translate-x-1/2 z-50'
    : 'absolute bottom-[calc(100%+10px)] left-1/2 -translate-x-1/2 z-50';

  const tooltipMotion = isMobile
    ? { initial: { opacity: 0, y: -6, scale: 0.97 }, animate: { opacity: 1, y: 0, scale: 1 }, exit: { opacity: 0, y: -6, scale: 0.97 } }
    : { initial: { opacity: 0, y: 6,  scale: 0.97 }, animate: { opacity: 1, y: 0, scale: 1 }, exit: { opacity: 0, y: 6,  scale: 0.97 } };

  return (
    <div className="flex flex-col items-center gap-[5px]">
      <div className="relative">
        <motion.button
          onHoverStart={handleHoverStart}
          onHoverEnd={handleHoverEnd}
          animate={{ boxShadow: shadowValue }}
          transition={{ duration: 0.15 }}
          style={{
            background: hovered ? '#fdfbf6' : '#ffffff',
            border: '1.3px solid rgba(217,201,169,0.7)',
            borderBottomWidth: '3px',
            borderBottomStyle: 'solid',
            borderBottomColor: bottomColor,
            borderRadius: '10px',
            padding: '8px 14px 6px',
            cursor: 'default',
            transition: 'background .1s, transform .1s',
            transform: hovered ? 'translateY(-2px)' : 'translateY(0)',
          }}
          className="select-none"
        >
          <span
            className="font-fraunces italic text-sm sm:text-[1.05rem] leading-snug"
            style={{ color: '#2a231a' }}
          >
            {word.text}
          </span>
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
                <div
                  className="absolute left-1/2 -translate-x-1/2 -top-[6px]"
                  style={{ width: 0, height: 0, borderLeft: '7px solid transparent', borderRight: '7px solid transparent', borderBottom: '7px solid #2a231a' }}
                />
              ) : (
                <div
                  className="absolute left-1/2 -translate-x-1/2 -bottom-[6px]"
                  style={{ width: 0, height: 0, borderLeft: '7px solid transparent', borderRight: '7px solid transparent', borderTop: '7px solid #2a231a' }}
                />
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Role label */}
      <span
        className="text-[9px] sm:text-[10px] font-sans uppercase tracking-wider leading-none select-none"
        style={{ color: rs.labelColor }}
      >
        {rs.short}
      </span>
    </div>
  );
}

// ─── TranslationDivider ──────────────────────────────────────────────────────

function TranslationDivider({ show, onToggle }: { show: boolean; onToggle: () => void }) {
  return (
    <div className="flex items-center gap-3 my-6">
      <div className="flex-1 h-px" style={{ background: 'var(--rule)' }} />
      <button
        onClick={onToggle}
        className="flex items-center gap-1.5 text-xs font-sans px-3 py-[5px] rounded-full select-none shrink-0 transition-all duration-150"
        style={{
          border: '1.2px solid var(--rule)',
          background: 'var(--cream)',
          color: 'var(--ink-muted)',
        }}
      >
        {show ? 'Hide Translation' : 'Show Translation'}
      </button>
      <div className="flex-1 h-px" style={{ background: 'var(--rule)' }} />
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
      className="absolute top-4 right-4 p-1 rounded transition-colors duration-150"
      style={{ color: 'var(--rule)' }}
    >
      {copied ? (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5" style={{ color: '#4a8b4a' }}>
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
  index: number;
  hoveredWordId: string | null;
  setHoveredWordId: (id: string | null) => void;
  wordMap: Map<string, Word>;
  isMobile: boolean;
  showTranslation: boolean;
}

function ClauseCard({
  clause,
  index,
  hoveredWordId,
  setHoveredWordId,
  wordMap,
  isMobile,
  showTranslation,
}: ClauseCardProps) {
  const [hoveredGroupId, setHoveredGroupId] = useState<string | null>(null);
  const cs = CLAUSE_STYLES[clause.type] ?? CLAUSE_STYLES.subordinate;
  const indent = clause.level * (isMobile ? 12 : 36);

  const wordToGroupIdx = new Map<string, number>();
  const wordToGroupId  = new Map<string, string>();
  clause.groups.forEach((group, i) => {
    group.wordIds.forEach((wid) => {
      wordToGroupIdx.set(wid, i % GROUP_PALETTE.length);
      wordToGroupId.set(wid, group.id);
    });
  });

  const relatedIds = new Set(
    hoveredWordId ? (wordMap.get(hoveredWordId)?.relatedWords ?? []) : [],
  );

  return (
    <div className="relative mb-4">
      {/* Connector for indented clauses */}
      {clause.level > 0 && (
        <>
          <div
            className="absolute top-0 bottom-0 w-px"
            style={{
              left: `${indent - (isMobile ? 7 : 18)}px`,
              background: `linear-gradient(to bottom, transparent 0%, ${cs.lineColor}44 20px, ${cs.lineColor}44 calc(100% - 20px), transparent 100%)`,
            }}
          />
          <div
            className="absolute w-2 h-2 rounded-full"
            style={{
              left: `${indent - (isMobile ? 11 : 22)}px`,
              top: '22px',
              backgroundColor: cs.lineColor,
              boxShadow: `0 0 8px ${cs.lineColor}50`,
              outline: '2.5px solid var(--bg)',
            }}
          />
        </>
      )}

      {/* Card */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: index * 0.07, ease: 'easeOut' }}
        style={{
          marginLeft: `${indent}px`,
          border: `1.5px solid ${cs.lineColor}22`,
          borderLeft: `5px solid ${cs.lineColor}`,
          borderRadius: '14px',
          backgroundColor: cs.bgColor,
          padding: isMobile ? '20px 18px 16px' : '28px 28px 20px',
        }}
      >
        {/* Badge */}
        <div
          className={[
            'inline-flex items-center gap-2 text-xs sm:text-sm font-sans font-medium',
            'px-3 py-1.5 rounded-full mb-4 sm:mb-5',
            cs.badgeClass,
          ].join(' ')}
        >
          <span className={['w-2 h-2 rounded-full shrink-0', cs.dot].join(' ')} />
          {clause.label}
        </div>

        {/* Word tokens */}
        <div className="flex flex-wrap gap-3 sm:gap-4 items-start">
          {clause.words.map((word) => {
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
        {clause.groups.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-4">
            {clause.groups.map((group, i) => {
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
                    isActive ? 'opacity-100' : 'opacity-50 hover:opacity-80',
                  ].join(' ')}
                  style={{ borderColor: palette.color + '40' }}
                >
                  {group.label}
                </button>
              );
            })}
          </div>
        )}

        {/* Clause translation */}
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
              <div className="mt-4 sm:mt-5 pt-3 sm:pt-4 border-t" style={{ borderColor: 'rgba(0,0,0,0.08)' }}>
                <p className="font-fraunces italic text-sm sm:text-base leading-relaxed" style={{ color: 'var(--ink-soft)' }}>
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

// ─── SentenceAnalysis ─────────────────────────────────────────────────────────

interface Props {
  result: AnalysisResult;
}

export default function SentenceAnalysis({ result }: Props) {
  const isMobile = useIsMobile();
  const [hoveredWordId, setHoveredWordId] = useState<string | null>(null);
  const [showTranslation, toggleTranslation] = useShowTranslation();

  const handleToggleTranslation = useCallback(() => {
    posthog.capture('translation_toggled', {
      new_state: showTranslation ? 'hidden' : 'visible',
    });
    toggleTranslation();
  }, [showTranslation, toggleTranslation]);

  const wordMap = new Map<string, Word>();
  for (const clause of result.clauses) {
    for (const word of clause.words) {
      wordMap.set(word.id, word);
    }
  }

  return (
    <div className="max-w-[900px] mx-auto px-3 sm:px-6 py-8 sm:py-12">

      {/* Original sentence */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="text-center mb-8 sm:mb-10"
      >
        <p
          className="font-fraunces italic text-xl sm:text-2xl tracking-wide leading-relaxed"
          style={{ color: 'var(--ink)' }}
        >
          {result.original}
        </p>
        <div className="mt-3 h-px w-20 mx-auto" style={{ background: 'var(--rule)' }} />
      </motion.div>

      {/* Clause cards */}
      <div>
        {result.clauses.map((clause, i) => (
          <ClauseCard
            key={clause.id}
            clause={clause}
            index={i}
            hoveredWordId={hoveredWordId}
            setHoveredWordId={setHoveredWordId}
            wordMap={wordMap}
            isMobile={isMobile}
            showTranslation={showTranslation}
          />
        ))}
      </div>

      {/* Translation toggle divider */}
      <TranslationDivider show={showTranslation} onToggle={handleToggleTranslation} />

      {/* Full English translation */}
      <AnimatePresence>
        {showTranslation && (
          <motion.div
            key="full-tr"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="relative flex overflow-hidden rounded-2xl mb-10"
            style={{ border: '1.5px solid var(--rule)', backgroundColor: 'var(--cream)' }}
          >
            {/* Amber left accent */}
            <div className="w-[5px] shrink-0" style={{ background: 'var(--amber)' }} />
            <div className="px-5 sm:px-8 py-5 sm:py-6 flex-1">
              <p
                className="text-[11px] font-sans font-medium uppercase tracking-[0.12em] mb-2.5"
                style={{ color: 'var(--amber-deep)' }}
              >
                English Translation
              </p>
              <p
                className="font-fraunces italic text-lg sm:text-xl leading-relaxed"
                style={{ color: 'var(--ink)' }}
              >
                &ldquo;{result.fullTranslation}&rdquo;
              </p>
            </div>
            <TranslationCopyButton text={result.fullTranslation} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
