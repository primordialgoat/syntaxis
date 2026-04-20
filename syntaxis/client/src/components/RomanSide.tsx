export default function RomanSide() {
  return (
    <div className="hero-side" aria-hidden="true">
      <svg viewBox="0 0 340 780" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="r-vineScroll" x="0" y="0" width="60" height="20" patternUnits="userSpaceOnUse">
            <path d="M0 10 Q15 0 30 10 T60 10" stroke="#8b5412" strokeWidth="1.2" fill="none"/>
            <circle cx="15" cy="5"  r="1.2" fill="#7a8550"/>
            <circle cx="45" cy="15" r="1.2" fill="#7a8550"/>
          </pattern>
          <linearGradient id="r-stoneWash" x1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#efe1c3"/>
            <stop offset="1" stopColor="#d6c198"/>
          </linearGradient>
        </defs>

        {/* SPQR standard */}
        <g transform="translate(210,30)">
          <line x1="20" y1="10" x2="20" y2="230" stroke="#8b5412" strokeWidth="2"/>
          {/* eagle */}
          <g transform="translate(20,12)">
            <path d="M-14 0 Q0 -14 14 0 Q20 6 14 10 Q8 8 0 6 Q-8 8 -14 10 Q-20 6 -14 0 Z"
                  fill="#c79a3a" stroke="#8b5412" strokeWidth="1.2"/>
            <circle cx="0" cy="-2" r="3" fill="#8b5412"/>
          </g>
          {/* banner */}
          <path d="M-6 38 L46 38 L54 58 L46 78 L-6 78 L2 58 Z" fill="#8a2e3b" stroke="#5e1f28" strokeWidth="1.4"/>
          <text x="20" y="64" textAnchor="middle" fontFamily="Fraunces, serif" fontWeight="700" fontSize="16" fill="#f6efe0" letterSpacing="1">SPQR</text>
          {/* wreath */}
          <g transform="translate(20,110)">
            <circle r="26" fill="none" stroke="#7a8550" strokeWidth="1.4"/>
            <g fill="#7a8550">
              <ellipse cx="0"   cy="-26" rx="3" ry="8"/>
              <ellipse cx="18"  cy="-18" rx="3" ry="8" transform="rotate(45 18 -18)"/>
              <ellipse cx="26"  cy="0"   rx="3" ry="8" transform="rotate(90 26 0)"/>
              <ellipse cx="18"  cy="18"  rx="3" ry="8" transform="rotate(135 18 18)"/>
              <ellipse cx="0"   cy="26"  rx="3" ry="8"/>
              <ellipse cx="-18" cy="18"  rx="3" ry="8" transform="rotate(-135 -18 18)"/>
              <ellipse cx="-26" cy="0"   rx="3" ry="8" transform="rotate(-90 -26 0)"/>
              <ellipse cx="-18" cy="-18" rx="3" ry="8" transform="rotate(-45 -18 -18)"/>
            </g>
            <text y="4"  textAnchor="middle" fontFamily="Fraunces, serif" fontSize="13" fill="#8b5412" fontStyle="italic">veni</text>
            <text y="18" textAnchor="middle" fontFamily="Fraunces, serif" fontSize="13" fill="#8b5412" fontStyle="italic">vidi vici</text>
          </g>
        </g>

        {/* Colosseum */}
        <g className="art-drift" transform="translate(30,180)">
          <rect x="0" y="160" width="280" height="18" fill="#d8c496" stroke="#8b5412" strokeWidth="1.2"/>
          <path d="M0 160 Q0 30 140 20 Q280 30 280 160 Z" fill="url(#r-stoneWash)" stroke="#8b5412" strokeWidth="1.5"/>
          {/* row 1 arches */}
          <g fill="#3a2e1c" stroke="#8b5412" strokeWidth="1">
            <path d="M14 160 V124 Q24 114 34 124 V160 Z"/>
            <path d="M46 160 V120 Q56 110 66 120 V160 Z"/>
            <path d="M78 160 V118 Q88 108 98 118 V160 Z"/>
            <path d="M110 160 V116 Q120 106 130 116 V160 Z"/>
            <path d="M142 160 V116 Q152 106 162 116 V160 Z"/>
            <path d="M174 160 V116 Q184 106 194 116 V160 Z"/>
            <path d="M206 160 V118 Q216 108 226 118 V160 Z"/>
            <path d="M238 160 V120 Q248 110 258 120 V160 Z"/>
          </g>
          <line x1="0"   y1="108" x2="280" y2="108" stroke="#8b5412" strokeWidth="1.2"/>
          {/* row 2 arches */}
          <g fill="#3a2e1c" stroke="#8b5412" strokeWidth="1">
            <path d="M22 104 V78 Q30 70 38 78 V104 Z"/>
            <path d="M52 104 V74 Q60 66 68 74 V104 Z"/>
            <path d="M82 104 V72 Q90 64 98 72 V104 Z"/>
            <path d="M112 104 V70 Q120 62 128 70 V104 Z"/>
            <path d="M142 104 V70 Q150 62 158 70 V104 Z"/>
            <path d="M172 104 V70 Q180 62 188 70 V104 Z"/>
            <path d="M202 104 V72 Q210 64 218 72 V104 Z"/>
            <path d="M232 104 V74 Q240 66 248 74 V104 Z"/>
          </g>
          <line x1="6"   y1="66"  x2="274" y2="66"  stroke="#8b5412" strokeWidth="1.2"/>
          {/* row 3 windows */}
          <g fill="#3a2e1c">
            <rect x="34"  y="44" width="8" height="16"/>
            <rect x="62"  y="40" width="8" height="18"/>
            <rect x="92"  y="38" width="8" height="20"/>
            <rect x="122" y="36" width="8" height="22"/>
            <rect x="152" y="36" width="8" height="22"/>
            <rect x="182" y="38" width="8" height="20"/>
            <rect x="210" y="40" width="8" height="18"/>
            <rect x="238" y="44" width="8" height="16"/>
          </g>
          {/* broken top */}
          <path d="M0 30 L30 25 L60 32 L100 22 L150 18 L200 26 L240 22 L280 30" fill="none" stroke="#8b5412" strokeWidth="1.2"/>
          <path d="M-20 178 L300 178 L300 196 L-20 196 Z" fill="#d8c496" opacity="0.5"/>
        </g>

        {/* She-wolf with Romulus & Remus */}
        <g className="art-sway" transform="translate(50,430)">
          <rect x="0" y="116" width="220" height="22" fill="#e2cfa5" stroke="#8b5412" strokeWidth="1.2"/>
          <text x="110" y="131" textAnchor="middle" fontFamily="Fraunces, serif" fontSize="10" letterSpacing="2" fill="#8b5412" fontStyle="italic">LVPA · ROMANA</text>
          <path d="M30 90 Q50 60 100 58 Q160 56 190 78 Q200 90 196 106 L186 106 L186 116 L176 116 L176 106 L60 106 L60 116 L50 116 L50 106 L40 106 Q28 104 30 90 Z"
                fill="#c79a3a" stroke="#8b5412" strokeWidth="1.5"/>
          <path d="M188 78 Q210 70 216 82 Q220 92 212 98 Q200 100 194 92 Z" fill="#c79a3a" stroke="#8b5412" strokeWidth="1.4"/>
          <polygon points="206,70 212,60 216,74" fill="#c79a3a" stroke="#8b5412" strokeWidth="1.2"/>
          <polygon points="196,70 200,60 206,72" fill="#c79a3a" stroke="#8b5412" strokeWidth="1.2"/>
          <circle cx="208" cy="84" r="1.4" fill="#2a231a"/>
          <circle cx="214" cy="92" r="1.2" fill="#2a231a"/>
          <path d="M30 90 Q10 70 16 100" stroke="#8b5412" strokeWidth="2" fill="none"/>
          <g fill="#efe1c3" stroke="#8b5412" strokeWidth="1.2">
            <circle cx="90"  cy="98" r="8"/>
            <circle cx="110" cy="98" r="8"/>
          </g>
          <circle cx="88"  cy="96" r="1" fill="#2a231a"/>
          <circle cx="92"  cy="96" r="1" fill="#2a231a"/>
          <circle cx="108" cy="96" r="1" fill="#2a231a"/>
          <circle cx="112" cy="96" r="1" fill="#2a231a"/>
        </g>

        {/* Scroll */}
        <g transform="translate(40,620)">
          <path d="M20 20 Q20 12 30 12 H170 Q180 12 180 20 V68 Q180 76 170 76 H30 Q20 76 20 68 Z"
                fill="#fbf6ea" stroke="#8b5412" strokeWidth="1.4"/>
          <rect x="14"  y="8" width="12" height="72" rx="6" fill="#c79a3a" stroke="#8b5412" strokeWidth="1.2"/>
          <rect x="174" y="8" width="12" height="72" rx="6" fill="#c79a3a" stroke="#8b5412" strokeWidth="1.2"/>
          <g stroke="#8b5412" strokeWidth="0.8" opacity="0.7">
            <line x1="34" y1="26" x2="168" y2="26"/>
            <line x1="34" y1="34" x2="160" y2="34"/>
            <line x1="34" y1="42" x2="168" y2="42"/>
            <line x1="34" y1="50" x2="152" y2="50"/>
            <line x1="34" y1="58" x2="168" y2="58"/>
            <line x1="34" y1="66" x2="140" y2="66"/>
          </g>
          <circle cx="100" cy="80" r="10" fill="#8a2e3b" stroke="#5e1f28" strokeWidth="1.2"/>
          <text x="100" y="83" textAnchor="middle" fontFamily="Fraunces, serif" fontWeight="700" fontSize="9" fill="#f6efe0">S</text>
        </g>

        {/* Floating Latin words */}
        <g fontFamily="Fraunces, serif" fill="#b8791f" opacity="0.35">
          <text x="40"  y="60"  fontSize="36" fontStyle="italic">veritas</text>
          <text x="150" y="400" fontSize="22" fontStyle="italic">pax</text>
          <text x="40"  y="730" fontSize="26" fontStyle="italic">amor</text>
        </g>

        {/* Vine scroll bottom border */}
        <g transform="translate(0,740)">
          <rect x="0" y="0" width="340" height="20" fill="url(#r-vineScroll)" opacity="0.7"/>
        </g>
      </svg>
    </div>
  );
}
