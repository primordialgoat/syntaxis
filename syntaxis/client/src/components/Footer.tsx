import { useState } from 'react';
import type { Route } from './routes';

interface Props {
  onNavigate: (route: Route) => void;
}

export default function Footer({ onNavigate }: Props) {
  const [copied, setCopied] = useState(false);

  const handleContact = async () => {
    try {
      await navigator.clipboard.writeText('lllenterprises68@gmail.com');
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  };

  const linkBase =
    'bg-transparent border-none cursor-pointer p-0 font-sans text-[13px] transition-colors duration-150';

  return (
    <footer
      className="mt-24 pt-10 pb-12 px-6 sm:px-10 flex flex-col items-center"
      style={{ borderTop: '1px solid rgba(201,168,76,0.08)' }}
    >
      {/* Diamond bullet */}
      <div
        className="w-[6px] h-[6px] mb-3.5"
        style={{ background: '#c9a84c', opacity: 0.55, transform: 'rotate(45deg)' }}
      />

      <div className="flex flex-wrap gap-x-5 gap-y-2 items-center justify-center">
        <button
          onClick={() => onNavigate('about')}
          className={`${linkBase} hover:text-zinc-200`}
          style={{ color: '#9a9284' }}
        >
          About
        </button>
        <span style={{ color: '#3a342c' }}>·</span>
        <button
          onClick={() => onNavigate('feedback')}
          className={`${linkBase} hover:text-zinc-200`}
          style={{ color: '#9a9284' }}
        >
          Send feedback
        </button>
        <span style={{ color: '#3a342c' }}>·</span>
        <button
          onClick={handleContact}
          className={linkBase}
          style={{ color: copied ? '#d4d0c8' : '#9a9284' }}
        >
          {copied ? 'Email copied ✓' : 'Contact'}
        </button>
      </div>

      {/* Motto — moved here from under the wordmark so it reads as a
           steady mark rather than an enthusiastic page-level tagline. */}
      <div
        className="mt-5 font-fraunces italic"
        style={{ fontSize: '12px', color: '#6a6660' }}
      >
        sententia clara fiat
      </div>

      <div
        className="mt-2 font-serif italic text-[11px]"
        style={{ color: '#6e6558', letterSpacing: '0.04em' }}
      >
        © MMXXVI · Syntaxis
      </div>
    </footer>
  );
}
