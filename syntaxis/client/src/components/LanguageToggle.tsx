import { useLanguage, type Language } from '../contexts/LanguageContext';

const OPTIONS: { lang: Language; label: string }[] = [
  { lang: 'latin', label: 'Latin' },
  { lang: 'greek', label: 'Ancient Greek' },
];

export default function LanguageToggle() {
  const { language, setLanguage } = useLanguage();

  return (
    <div
      className="inline-flex items-center rounded-full p-[3px] gap-0.5"
      style={{
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.08)',
      }}
    >
      {OPTIONS.map(({ lang, label }) => {
        const active = language === lang;
        const isLatin = lang === 'latin';
        return (
          <button
            key={lang}
            type="button"
            onClick={() => setLanguage(lang)}
            className="px-4 py-1.5 rounded-full font-sans text-sm font-medium transition-all duration-200 select-none"
            style={{
              background: active ? (isLatin ? '#c9a84c' : '#a8bfd4') : 'transparent',
              color: active ? (isLatin ? '#1a1610' : '#0d1520') : '#6e6558',
              letterSpacing: '0.01em',
            }}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
