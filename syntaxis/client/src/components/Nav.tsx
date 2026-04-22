import type { Route } from './routes';

interface Props {
  currentRoute: Route;
  onNavigate: (route: Route) => void;
}

export default function Nav({ currentRoute, onNavigate }: Props) {
  return (
    <nav
      className="flex justify-between items-center px-5 sm:px-10 py-5"
      style={{ borderBottom: '1px solid rgba(201,168,76,0.08)' }}
    >
      <button
        onClick={() => onNavigate('landing')}
        className="font-serif text-[22px] leading-none bg-transparent border-none cursor-pointer p-0"
        style={{ color: '#c9a84c', letterSpacing: '0.01em' }}
        aria-label="Syntaxis home"
      >
        Syntaxis
      </button>

      {currentRoute === 'landing' ? (
        <button
          onClick={() => onNavigate('about')}
          className="font-sans text-[13px] font-medium px-2.5 py-1.5 bg-transparent border-none cursor-pointer transition-colors duration-150 hover:text-zinc-200"
          style={{ color: '#9a9284', letterSpacing: '0.04em' }}
        >
          About
        </button>
      ) : (
        <button
          onClick={() => onNavigate('landing')}
          className="font-sans text-[13px] font-medium px-2.5 py-1.5 bg-transparent border-none cursor-pointer transition-opacity duration-150 hover:opacity-80"
          style={{ color: '#c9a84c', letterSpacing: '0.04em' }}
        >
          ← Back
        </button>
      )}
    </nav>
  );
}
