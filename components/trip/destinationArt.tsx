import Image from "next/image";
import { cn } from "@/lib/utils";
import type { Destination } from "@/types/destination";

type Motif = "coast" | "peaks" | "city" | "forest" | "desert";

const PALETTES: Record<Motif, { sky: [string, string]; land: string; accent: string }> = {
  coast: { sky: ["#8fd7d2", "#f6e3c5"], land: "#1f7a6d", accent: "#f2a65a" },
  peaks: { sky: ["#9fb6d8", "#e8eef6"], land: "#3c5a78", accent: "#f0f4f8" },
  city: { sky: ["#f0b38a", "#f6d9bb"], land: "#5a4b6b", accent: "#ffd9a0" },
  forest: { sky: ["#bcd9a8", "#eef3e2"], land: "#2f6b43", accent: "#8cc06a" },
  desert: { sky: ["#f3c37f", "#f8e5c2"], land: "#a9703f", accent: "#f6efdc" },
};

function motifFor(destination: Destination): Motif {
  const tags = new Set(destination.tags);
  if (tags.has("beach")) return "coast";
  if (destination.regions.some((r) => /himalaya|alps|ghats|nilgiri/i.test(r))) return "peaks";
  if (tags.has("nature")) return "forest";
  if (destination.notableFor.some((n) => /desert/i.test(n))) return "desert";
  if (tags.has("shopping") || tags.has("nightlife") || tags.has("culture")) return "city";
  return "peaks";
}

/**
 * A real photograph of the destination where we have one, and generated
 * artwork where we do not — never a broken image and never a blank card.
 */
export function DestinationArt({
  destination,
  className,
  photoUrl,
  sizes = "(max-width: 768px) 100vw, 400px",
  priority = false,
}: {
  destination: Destination;
  className?: string;
  /** Overrides the catalog photo, e.g. with a live Places photo. */
  photoUrl?: string | null;
  sizes?: string;
  priority?: boolean;
}) {
  const photo = photoUrl ?? destination.representativeImage?.url ?? null;

  if (photo) {
    return (
      <Image
        src={photo}
        alt={`${destination.name}, ${destination.country}`}
        fill
        sizes={sizes}
        priority={priority}
        className={cn("object-cover", className)}
      />
    );
  }

  return <GeneratedArt destination={destination} className={className} />;
}

/** Credit line required by the image licence. */
export function DestinationPhotoCredit({
  destination,
  className,
}: {
  destination: Destination;
  className?: string;
}) {
  const image = destination.representativeImage;
  if (!image) return null;

  return (
    <p className={cn("text-xs text-ink-faint", className)}>
      Photo:{" "}
      <a
        href={image.source}
        target="_blank"
        rel="noopener noreferrer"
        className="underline underline-offset-2 hover:text-ink-soft"
      >
        {image.credit}
      </a>{" "}
      · {image.licence} via Wikimedia Commons
    </p>
  );
}

function GeneratedArt({
  destination,
  className,
}: {
  destination: Destination;
  className?: string;
}) {
  const motif = motifFor(destination);
  const palette = PALETTES[motif];
  const id = `art-${destination.id}`;
  let hash = 0;
  for (let i = 0; i < destination.id.length; i++) {
    hash = (hash * 31 + destination.id.charCodeAt(i)) >>> 0;
  }
  const shift = (hash % 30) - 15;

  return (
    <svg
      viewBox="0 0 400 220"
      preserveAspectRatio="xMidYMid slice"
      role="img"
      aria-label={`Illustration of ${destination.name}`}
      className={cn("h-full w-full", className)}
    >
      <defs>
        <linearGradient id={`${id}-sky`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={palette.sky[0]} />
          <stop offset="100%" stopColor={palette.sky[1]} />
        </linearGradient>
      </defs>
      <rect width="400" height="220" fill={`url(#${id}-sky)`} />
      <circle cx={310 + shift} cy={58} r={26} fill={palette.accent} opacity="0.85" />

      {motif === "coast" ? (
        <>
          <path
            d={`M0 150 Q ${100 + shift} 132 200 150 T 400 148 V220 H0 Z`}
            fill={palette.land}
            opacity="0.92"
          />
          <path d="M0 170 Q 100 156 200 172 T 400 168 V220 H0 Z" fill={palette.land} />
        </>
      ) : null}

      {motif === "peaks" ? (
        <>
          <path
            d={`M-20 220 L ${110 + shift} 78 L 200 150 L ${270 + shift} 62 L 420 220 Z`}
            fill={palette.land}
          />
          <path
            d={`M${110 + shift} 78 L ${145 + shift} 116 L ${75 + shift} 116 Z`}
            fill={palette.accent}
            opacity="0.9"
          />
        </>
      ) : null}

      {motif === "forest" ? (
        <>
          <path d="M0 160 Q 100 140 200 162 T 400 156 V220 H0 Z" fill={palette.land} opacity="0.9" />
          {[40, 95, 150, 215, 280, 340].map((x, index) => (
            <path
              key={x}
              d={`M${x + (index % 2 ? shift / 3 : 0)} 190 L ${x + 16} 148 L ${x + 32} 190 Z`}
              fill={palette.accent}
              opacity="0.85"
            />
          ))}
          <rect y="188" width="400" height="32" fill={palette.land} />
        </>
      ) : null}

      {motif === "city" ? (
        <>
          <rect y="168" width="400" height="52" fill={palette.land} />
          {[30, 78, 126, 180, 236, 292, 344].map((x, index) => (
            <rect
              key={x}
              x={x}
              y={168 - (34 + ((index * 23 + shift) % 60))}
              width="36"
              height={34 + ((index * 23 + shift) % 60)}
              rx="4"
              fill={palette.land}
              opacity={0.75 + (index % 3) * 0.08}
            />
          ))}
        </>
      ) : null}

      {motif === "desert" ? (
        <>
          <path
            d={`M0 168 Q ${120 + shift} 128 230 170 T 400 160 V220 H0 Z`}
            fill={palette.land}
            opacity="0.9"
          />
          <path d="M0 194 Q 140 172 260 196 T 400 190 V220 H0 Z" fill={palette.land} />
        </>
      ) : null}
    </svg>
  );
}
