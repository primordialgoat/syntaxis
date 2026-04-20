export default function GreekSide() {
  return (
    <div className="hero-side" aria-hidden="true">
      <svg viewBox="0 0 340 780" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="g-meander" x="0" y="0" width="48" height="18" patternUnits="userSpaceOnUse">
            <path d="M0 9 H6 V3 H18 V15 H12 V9 H24 V3 H36 V15 H30 V9 H48" stroke="#8b5412" strokeWidth="1.4" fill="none"/>
          </pattern>
          <linearGradient id="g-colWash" x1="0" x2="1">
            <stop offset="0" stopColor="#efe1c3"/>
            <stop offset="1" stopColor="#e2cfa5"/>
          </linearGradient>
        </defs>

        {/* Faint laurel arc */}
        <g opacity="0.25" transform="translate(20,30)">
          <path d="M10 40 Q110 -20 260 50" stroke="#7a8550" strokeWidth="1.2" fill="none"/>
          <g fill="#7a8550">
            <ellipse cx="30"  cy="36" rx="10" ry="3.5" transform="rotate(-30 30 36)"/>
            <ellipse cx="60"  cy="24" rx="10" ry="3.5" transform="rotate(-20 60 24)"/>
            <ellipse cx="95"  cy="16" rx="10" ry="3.5" transform="rotate(-10 95 16)"/>
            <ellipse cx="135" cy="12" rx="10" ry="3.5"/>
            <ellipse cx="175" cy="16" rx="10" ry="3.5" transform="rotate(10 175 16)"/>
            <ellipse cx="215" cy="26" rx="10" ry="3.5" transform="rotate(20 215 26)"/>
            <ellipse cx="245" cy="40" rx="10" ry="3.5" transform="rotate(30 245 40)"/>
          </g>
        </g>

        {/* Parthenon pediment */}
        <g className="art-drift" transform="translate(30,90)">
          <polygon points="130,0 260,60 0,60" fill="#e8d6ac" stroke="#8b5412" strokeWidth="1.5"/>
          <polygon points="130,6 245,58 15,58" fill="none" stroke="#b8791f" strokeWidth="1"/>
          {/* figures */}
          <circle cx="90"  cy="48" r="6" fill="#8b5412"/>
          <rect   x="87"   y="52" width="6"  height="8"  fill="#8b5412"/>
          <circle cx="130" cy="42" r="7" fill="#8b5412"/>
          <rect   x="127"  y="47" width="6"  height="13" fill="#8b5412"/>
          <circle cx="170" cy="48" r="6" fill="#8b5412"/>
          <rect   x="167"  y="52" width="6"  height="8"  fill="#8b5412"/>
          {/* entablature */}
          <rect x="-5" y="60" width="270" height="10" fill="#f1e1ba" stroke="#8b5412" strokeWidth="1.2"/>
          <rect x="-5" y="60" width="270" height="10" fill="url(#g-meander)" opacity="0.7"/>
          {/* columns */}
          <g stroke="#8b5412" strokeWidth="1.2">
            <rect x="12"  y="72" width="22" height="180" fill="url(#g-colWash)"/>
            <rect x="62"  y="72" width="22" height="180" fill="url(#g-colWash)"/>
            <rect x="112" y="72" width="22" height="180" fill="url(#g-colWash)"/>
            <rect x="162" y="72" width="22" height="180" fill="url(#g-colWash)"/>
            <rect x="212" y="72" width="22" height="180" fill="url(#g-colWash)"/>
            {/* flutes */}
            <g strokeWidth="0.6" opacity="0.8">
              <line x1="18"  y1="74" x2="18"  y2="250"/>
              <line x1="24"  y1="74" x2="24"  y2="250"/>
              <line x1="30"  y1="74" x2="30"  y2="250"/>
              <line x1="68"  y1="74" x2="68"  y2="250"/>
              <line x1="74"  y1="74" x2="74"  y2="250"/>
              <line x1="80"  y1="74" x2="80"  y2="250"/>
              <line x1="118" y1="74" x2="118" y2="250"/>
              <line x1="124" y1="74" x2="124" y2="250"/>
              <line x1="130" y1="74" x2="130" y2="250"/>
              <line x1="168" y1="74" x2="168" y2="250"/>
              <line x1="174" y1="74" x2="174" y2="250"/>
              <line x1="180" y1="74" x2="180" y2="250"/>
              <line x1="218" y1="74" x2="218" y2="250"/>
              <line x1="224" y1="74" x2="224" y2="250"/>
              <line x1="230" y1="74" x2="230" y2="250"/>
            </g>
            {/* capitals */}
            <rect x="8"   y="68" width="30" height="6" fill="#f1e1ba"/>
            <rect x="58"  y="68" width="30" height="6" fill="#f1e1ba"/>
            <rect x="108" y="68" width="30" height="6" fill="#f1e1ba"/>
            <rect x="158" y="68" width="30" height="6" fill="#f1e1ba"/>
            <rect x="208" y="68" width="30" height="6" fill="#f1e1ba"/>
            {/* bases */}
            <rect x="8"   y="250" width="30" height="8" fill="#e2cfa5"/>
            <rect x="58"  y="250" width="30" height="8" fill="#e2cfa5"/>
            <rect x="108" y="250" width="30" height="8" fill="#e2cfa5"/>
            <rect x="158" y="250" width="30" height="8" fill="#e2cfa5"/>
            <rect x="208" y="250" width="30" height="8" fill="#e2cfa5"/>
          </g>
          {/* steps */}
          <rect x="-10"  y="258" width="280" height="6" fill="#e2cfa5" stroke="#8b5412" strokeWidth="1"/>
          <rect x="-18"  y="264" width="296" height="8" fill="#d8c496" stroke="#8b5412" strokeWidth="1"/>
        </g>

        {/* Socrates bust on plinth */}
        <g className="art-sway" transform="translate(30,430)">
          <rect x="34"  y="132" width="82" height="30" fill="#e8d6ac" stroke="#8b5412" strokeWidth="1.4"/>
          <rect x="30"  y="160" width="90" height="8"  fill="#d8c496" stroke="#8b5412" strokeWidth="1"/>
          <text x="75" y="152" textAnchor="middle" fontFamily="Fraunces, serif" fontSize="10" fill="#8b5412" letterSpacing="2">ΣΟΦΙΑ</text>
          <path d="M50 132 Q50 100 75 96 Q100 100 100 132 Z" fill="#efe1c3" stroke="#8b5412" strokeWidth="1.4"/>
          <ellipse cx="75" cy="70" rx="32" ry="36" fill="#efe1c3" stroke="#8b5412" strokeWidth="1.4"/>
          <path d="M55 82 Q75 122 95 82 Q92 100 75 104 Q58 100 55 82 Z" fill="#d8c496" stroke="#8b5412" strokeWidth="1.2"/>
          <g fill="#d8c496" stroke="#8b5412" strokeWidth="1">
            <circle cx="52" cy="52" r="6"/>
            <circle cx="62" cy="44" r="6"/>
            <circle cx="75" cy="40" r="6"/>
            <circle cx="88" cy="44" r="6"/>
            <circle cx="98" cy="52" r="6"/>
          </g>
          <circle cx="66" cy="66" r="1.8" fill="#2a231a"/>
          <circle cx="84" cy="66" r="1.8" fill="#2a231a"/>
          <path d="M70 74 Q75 76 80 74" stroke="#2a231a" strokeWidth="1.2" fill="none"/>
          <path d="M72 80 Q75 82 78 80" stroke="#8b5412" strokeWidth="1"   fill="none"/>
          <path d="M60 58 Q66 55 72 58" stroke="#8b5412" strokeWidth="1.2" fill="none"/>
          <path d="M78 58 Q84 55 90 58" stroke="#8b5412" strokeWidth="1.2" fill="none"/>
        </g>

        {/* Owl of Athena */}
        <g transform="translate(220,460)" className="art-drift">
          <ellipse cx="40" cy="52" rx="28" ry="34" fill="#d8c496" stroke="#8b5412" strokeWidth="1.4"/>
          <ellipse cx="40" cy="42" rx="22" ry="20" fill="#efe1c3" stroke="#8b5412" strokeWidth="1.2"/>
          <circle cx="31" cy="42" r="7" fill="#fff" stroke="#8b5412" strokeWidth="1.2"/>
          <circle cx="49" cy="42" r="7" fill="#fff" stroke="#8b5412" strokeWidth="1.2"/>
          <circle cx="31" cy="43" r="3" fill="#2a231a"/>
          <circle cx="49" cy="43" r="3" fill="#2a231a"/>
          <polygon points="40,48 36,54 44,54" fill="#b8791f" stroke="#8b5412" strokeWidth="1"/>
          <path d="M20 60 Q28 70 22 82" stroke="#8b5412" strokeWidth="1" fill="none"/>
          <path d="M60 60 Q52 70 58 82" stroke="#8b5412" strokeWidth="1" fill="none"/>
          <path d="M30 68 Q40 78 50 68" stroke="#8b5412" strokeWidth="1" fill="none"/>
          <line x1="18" y1="88" x2="62" y2="88" stroke="#8b5412" strokeWidth="1.6"/>
          <path d="M35 86 L33 94 M37 86 L37 94 M39 86 L41 94" stroke="#8b5412" strokeWidth="1"/>
          <path d="M45 86 L43 94 M47 86 L47 94 M49 86 L51 94" stroke="#8b5412" strokeWidth="1"/>
        </g>

        {/* Lyre */}
        <g transform="translate(40,640)">
          <path d="M30 80 Q10 60 20 20 Q30 0 44 8"   fill="none" stroke="#8b5412" strokeWidth="2"/>
          <path d="M90 80 Q110 60 100 20 Q90 0 76 8"  fill="none" stroke="#8b5412" strokeWidth="2"/>
          <path d="M25 78 Q60 92 95 78 L90 96 Q60 104 30 96 Z" fill="#c79a3a" stroke="#8b5412" strokeWidth="1.4"/>
          <g stroke="#8b5412" strokeWidth="0.8">
            <line x1="40" y1="12" x2="40" y2="84"/>
            <line x1="50" y1="10" x2="50" y2="84"/>
            <line x1="60" y1="8"  x2="60" y2="84"/>
            <line x1="70" y1="10" x2="70" y2="84"/>
            <line x1="80" y1="12" x2="80" y2="84"/>
          </g>
          <rect x="18" y="8" width="84" height="6" fill="#b8791f" stroke="#8b5412" strokeWidth="1.2" rx="2"/>
        </g>

        {/* Floating Greek words */}
        <g fontFamily="Fraunces, serif" fill="#b8791f" opacity="0.35">
          <text x="200" y="60"  fontSize="38" fontStyle="italic">λόγος</text>
          <text x="30"  y="410" fontSize="26" fontStyle="italic">ἀρετή</text>
          <text x="210" y="710" fontSize="22" fontStyle="italic">σοφία</text>
        </g>

        {/* Meander bottom border */}
        <g transform="translate(0,740)">
          <rect x="0" y="0" width="340" height="18" fill="url(#g-meander)" opacity="0.7"/>
        </g>
      </svg>
    </div>
  );
}
