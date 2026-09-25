import { Polaroid } from "@/components/journal/polaroid";
import { cn } from "@/lib/utils";
import type { Photo } from "@/lib/group";

const TILTS = [-8, 3, 9];

/**
 * A few small photos dropped on the page, overlapping. Sits where the old
 * illustrations were: a reminder of what all this planning is for.
 */
export function PhotoStrip({
  photos,
  captions,
  className,
}: {
  photos: Photo[];
  captions?: string[];
  className?: string;
}) {
  return (
    <div aria-hidden className={cn("flex items-center justify-center", className)}>
      {photos.slice(0, 3).map((photo, index) => (
        <div
          key={photo.src}
          className={cn("w-32 sm:w-40", index > 0 && "-ml-8 sm:-ml-10", index === 1 && "z-10 -mt-4")}
        >
          <Polaroid
            photo={photo}
            tilt={TILTS[index]}
            tape={index === 1 ? "top" : "none"}
            caption={captions?.[index] ?? ""}
            sizes="160px"
            delay={index * 90}
          />
        </div>
      ))}
    </div>
  );
}
