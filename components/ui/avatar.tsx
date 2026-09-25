import { initials } from "@/lib/utils";
import { cn } from "@/lib/utils";

const TONES = [
  "bg-primary-soft text-primary",
  "bg-accent-soft text-accent",
  "bg-good-soft text-good",
  "bg-partial-soft text-partial",
  "bg-strong-soft text-strong",
];

export function Avatar({ name, className }: { name: string; className?: string }) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  const tone = TONES[hash % TONES.length];
  return (
    <span
      aria-hidden
      className={cn(
        "flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
        tone,
        className,
      )}
    >
      {initials(name)}
    </span>
  );
}
