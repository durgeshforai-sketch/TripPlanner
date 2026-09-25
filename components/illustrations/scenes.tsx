import { cn } from "@/lib/utils";

/**
 * Hand-authored SVG scenes.
 *
 * These carry the friendly, illustrated tone of the product on the marketing
 * and celebration screens. They are drawn rather than sourced so they theme
 * with the palette, scale cleanly and cost nothing to load.
 */

interface SceneProps {
  className?: string;
  /** Scenes are decorative by default; pass a label when one carries meaning. */
  label?: string;
}

function svgProps(label?: string) {
  return label
    ? ({ role: "img" as const, "aria-label": label })
    : ({ "aria-hidden": true as const, focusable: "false" as const });
}

/** Four friends watching a sunset — the landing hero. */
export function TravellersScene({ className, label }: SceneProps) {
  return (
    <svg viewBox="0 0 480 340" className={cn("h-full w-full", className)} {...svgProps(label)}>
      <defs>
        <linearGradient id="tv-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#8b7bf0" />
          <stop offset="42%" stopColor="#e4a2c8" />
          <stop offset="78%" stopColor="#ffc89b" />
          <stop offset="100%" stopColor="#ffe3c0" />
        </linearGradient>
        <linearGradient id="tv-sea" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f6b98a" />
          <stop offset="100%" stopColor="#c07bb4" />
        </linearGradient>
        <clipPath id="tv-clip">
          <rect width="480" height="340" rx="28" />
        </clipPath>
      </defs>

      <g clipPath="url(#tv-clip)">
        <rect width="480" height="340" fill="url(#tv-sky)" />

        <circle cx="330" cy="150" r="46" fill="#fff0cf" opacity="0.95" />
        <circle cx="330" cy="150" r="66" fill="#fff0cf" opacity="0.25" />

        {/* Distant range */}
        <path d="M0 196 L74 132 L128 178 L182 120 L248 196 Z" fill="#6f5cc9" opacity="0.55" />
        <path d="M196 196 L268 124 L322 170 L380 128 L480 196 Z" fill="#6f5cc9" opacity="0.4" />

        {/* Sea */}
        <rect y="196" width="480" height="70" fill="url(#tv-sea)" />
        {/* Sun reflection, narrowing as it nears the horizon */}
        {[206, 218, 230, 242].map((y, index) => {
          const width = 26 + index * 20;
          return (
            <rect
              key={y}
              x={330 - width / 2}
              y={y}
              width={width}
              height="3"
              rx="1.5"
              fill="#fff3d6"
              opacity={0.42 - index * 0.07}
            />
          );
        })}

        {/* Headland */}
        <path d="M0 214 Q 70 186 140 210 L140 266 L0 266 Z" fill="#4c3f96" opacity="0.65" />

        {/* Foreground cliff */}
        <path d="M-10 268 Q 120 236 246 262 Q 360 284 490 258 L490 350 L-10 350 Z" fill="#2f2769" />

        {/* Four friends, backs to us */}
        <g fill="#231c52">
          {[
            { x: 150, h: 34 },
            { x: 194, h: 40 },
            { x: 240, h: 36 },
            { x: 286, h: 42 },
          ].map((p, index) => (
            <g key={p.x} transform={`translate(${p.x} ${262 - p.h})`}>
              <circle cx="0" cy="0" r="9" />
              <path d={`M-11 ${p.h} Q -11 10 0 10 Q 11 10 11 ${p.h} Z`} />
              {index === 1 ? (
                <path d="M9 15 L21 -4" stroke="#231c52" strokeWidth="4.5" strokeLinecap="round" />
              ) : null}
              {index === 3 ? (
                <rect x="-22" y="17" width="12" height="16" rx="4" />
              ) : null}
            </g>
          ))}
        </g>

        {/* Birds */}
        <g stroke="#3b2f77" strokeWidth="2.4" fill="none" strokeLinecap="round" opacity="0.7">
          <path d="M92 92 q 8 -7 16 0" />
          <path d="M112 78 q 7 -6 14 0" />
          <path d="M404 104 q 8 -7 16 0" />
        </g>
      </g>
    </svg>
  );
}

/** A camper van on an open road — used where people choose how to start. */
export function RoadTripScene({ className, label }: SceneProps) {
  return (
    <svg viewBox="0 0 420 260" className={cn("h-full w-full", className)} {...svgProps(label)}>
      <defs>
        <linearGradient id="rt-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#cfe4ff" />
          <stop offset="100%" stopColor="#ffe9d6" />
        </linearGradient>
        <clipPath id="rt-clip">
          <rect width="420" height="260" rx="24" />
        </clipPath>
      </defs>

      <g clipPath="url(#rt-clip)">
        <rect width="420" height="260" fill="url(#rt-sky)" />
        <circle cx="342" cy="60" r="30" fill="#ffd79b" />

        <path d="M0 150 L66 96 L118 142 L166 108 L228 150 Z" fill="#7fa9c9" opacity="0.7" />
        <path d="M176 150 L246 100 L300 140 L352 110 L420 150 Z" fill="#6b96ba" opacity="0.6" />

        <rect y="150" width="420" height="110" fill="#8fc98a" />
        <path d="M0 186 Q 210 166 420 190 L420 260 L0 260 Z" fill="#6fb772" />

        {/* Road */}
        <path d="M60 260 Q 176 200 420 196 L420 260 Z" fill="#4c4a6a" />
        {[0, 1, 2, 3].map((index) => (
          <rect
            key={index}
            x={150 + index * 66}
            y={236 - index * 11}
            width="30"
            height="4"
            rx="2"
            fill="#fdf6e8"
            opacity="0.85"
          />
        ))}

        {/* Van */}
        <g transform="translate(96 146)">
          <rect x="0" y="16" width="118" height="46" rx="12" fill="#f6f2ea" />
          <path d="M84 16 h20 q16 0 20 16 v12 h-40 z" fill="#f6f2ea" />
          <rect x="0" y="16" width="118" height="15" rx="7" fill="#5b4be8" />
          <rect x="10" y="36" width="26" height="17" rx="4" fill="#bcd9f2" />
          <rect x="44" y="36" width="26" height="17" rx="4" fill="#bcd9f2" />
          <rect x="88" y="34" width="26" height="17" rx="4" fill="#bcd9f2" />
          <circle cx="28" cy="64" r="11" fill="#31304a" />
          <circle cx="28" cy="64" r="4.5" fill="#cfcde0" />
          <circle cx="98" cy="64" r="11" fill="#31304a" />
          <circle cx="98" cy="64" r="4.5" fill="#cfcde0" />
          <rect x="24" y="4" width="66" height="9" rx="4" fill="#ff8b6b" />
        </g>

        {/* Trees */}
        {[24, 372, 398].map((x, index) => (
          <g key={x} transform={`translate(${x} ${168 + index * 6})`}>
            <rect x="-3" y="14" width="6" height="18" rx="2" fill="#6b4a32" />
            <circle cx="0" cy="6" r="15" fill="#3f8f52" />
            <circle cx="-9" cy="14" r="10" fill="#4a9d5c" />
            <circle cx="9" cy="14" r="10" fill="#4a9d5c" />
          </g>
        ))}
      </g>
    </svg>
  );
}

/** A paper plane and confetti — the trip-is-ready and decided moments. */
export function CelebrationScene({ className, label }: SceneProps) {
  const confetti = [
    { x: 40, y: 34, r: -20, c: "#5b4be8" },
    { x: 88, y: 16, r: 30, c: "#ff8b6b" },
    { x: 150, y: 40, r: -10, c: "#f4c13d" },
    { x: 246, y: 20, r: 24, c: "#3fbf8f" },
    { x: 300, y: 46, r: -32, c: "#5b4be8" },
    { x: 348, y: 22, r: 14, c: "#ff8b6b" },
    { x: 66, y: 120, r: 42, c: "#3fbf8f" },
    { x: 336, y: 128, r: -24, c: "#f4c13d" },
  ];

  return (
    <svg viewBox="0 0 400 200" className={cn("h-full w-full", className)} {...svgProps(label)}>
      <defs>
        <linearGradient id="cs-plane" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#8f80ff" />
          <stop offset="100%" stopColor="#5b4be8" />
        </linearGradient>
      </defs>

      {confetti.map((piece) => (
        <rect
          key={`${piece.x}-${piece.y}`}
          x={piece.x}
          y={piece.y}
          width="9"
          height="4"
          rx="2"
          fill={piece.c}
          opacity="0.85"
          transform={`rotate(${piece.r} ${piece.x + 4} ${piece.y + 2})`}
        />
      ))}

      {/* Dashed flight path */}
      <path
        d="M52 160 Q 150 150 196 104 Q 240 60 334 62"
        stroke="#5b4be8"
        strokeWidth="2.5"
        strokeDasharray="7 8"
        strokeLinecap="round"
        fill="none"
        opacity="0.45"
      />

      {/* Paper plane */}
      <g transform="translate(300 34) rotate(12)">
        <path d="M0 28 L74 0 L52 60 L38 38 Z" fill="url(#cs-plane)" />
        <path d="M0 28 L52 60 L38 38 Z" fill="#3d2fc4" opacity="0.65" />
        <path d="M74 0 L38 38" stroke="#efeaff" strokeWidth="1.5" opacity="0.8" />
      </g>

      <circle cx="52" cy="160" r="7" fill="#ff8b6b" />
      <circle cx="52" cy="160" r="13" fill="#ff8b6b" opacity="0.25" />
    </svg>
  );
}

/** A map with pins being searched — shown while options are computed. */
export function SearchingScene({ className, label }: SceneProps) {
  return (
    <svg viewBox="0 0 320 200" className={cn("h-full w-full", className)} {...svgProps(label)}>
      <defs>
        <linearGradient id="sc-map" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#ede9ff" />
          <stop offset="100%" stopColor="#dfe9fb" />
        </linearGradient>
      </defs>

      <g transform="rotate(-6 160 100)">
        <rect x="40" y="36" width="240" height="132" rx="16" fill="url(#sc-map)" />
        <path d="M40 120 Q 110 92 172 122 T 280 112" stroke="#b9b1ee" strokeWidth="3" fill="none" />
        <path d="M96 36 Q 116 92 92 168" stroke="#b9b1ee" strokeWidth="3" fill="none" />
        <path d="M214 36 Q 200 96 226 168" stroke="#b9b1ee" strokeWidth="3" fill="none" />
        <rect x="40" y="36" width="240" height="132" rx="16" fill="none" stroke="#c9c1f2" strokeWidth="2" />
      </g>

      {[
        { x: 104, y: 80, c: "#5b4be8" },
        { x: 176, y: 62, c: "#ff8b6b" },
        { x: 220, y: 116, c: "#3fbf8f" },
      ].map((pin) => (
        <g key={pin.x} transform={`translate(${pin.x} ${pin.y})`}>
          <path d="M0 22 C -11 8 -13 0 -13 -4 A 13 13 0 0 1 13 -4 C 13 0 11 8 0 22 Z" fill={pin.c} />
          <circle cy="-4" r="5" fill="#ffffff" />
        </g>
      ))}

      {/* Magnifier */}
      <g transform="translate(196 104)">
        <circle r="30" fill="none" stroke="#5b4be8" strokeWidth="6" opacity="0.9" />
        <circle r="30" fill="#8f80ff" opacity="0.12" />
        <path d="M22 22 L44 44" stroke="#5b4be8" strokeWidth="8" strokeLinecap="round" />
      </g>
    </svg>
  );
}
