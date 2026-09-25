import * as React from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import type { Photo } from "@/lib/group";

type TapePosition = "top" | "corners" | "none";

interface FrameProps {
  /** Degrees. Small, varied angles are what make a wall of photos feel pinned by hand. */
  tilt?: number;
  tape?: TapePosition;
  caption?: React.ReactNode;
  className?: string;
  interactive?: boolean;
  /** Stagger for the settle-in animation, in ms. */
  delay?: number;
  children: React.ReactNode;
}

export function Tape({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return <span aria-hidden className={cn("tape", className)} style={style} />;
}

/** The white-bordered frame. Pass any image as children. */
export function PolaroidFrame({
  tilt = 0,
  tape = "top",
  caption,
  className,
  interactive,
  delay,
  children,
}: FrameProps) {
  return (
    <figure
      className={cn(
        "polaroid relative animate-settle",
        interactive && "polaroid-interactive",
        className,
      )}
      style={
        {
          "--tilt": `${tilt}deg`,
          animationDelay: delay ? `${delay}ms` : undefined,
        } as React.CSSProperties
      }
    >
      {tape === "top" ? (
        <Tape className="-top-3 left-1/2 -translate-x-1/2 rotate-[-4deg]" />
      ) : tape === "corners" ? (
        <>
          <Tape className="-left-5 -top-2 w-20 -rotate-[38deg]" />
          <Tape className="-right-5 -top-2 w-20 rotate-[38deg]" />
        </>
      ) : null}
      <div className="relative overflow-hidden rounded-[2px] bg-bg-tint">{children}</div>
      <figcaption className="flex min-h-12 items-center justify-center px-2 py-2 text-center font-hand text-xl leading-tight sm:text-2xl">
        {caption}
      </figcaption>
    </figure>
  );
}

/** A catalog photo in a polaroid, optimised through next/image. */
export function Polaroid({
  photo,
  aspect = "4/3",
  sizes = "(min-width: 1024px) 25vw, 50vw",
  priority,
  ...frame
}: Omit<FrameProps, "children"> & {
  photo: Photo;
  aspect?: string;
  sizes?: string;
  priority?: boolean;
}) {
  return (
    <PolaroidFrame {...frame}>
      <div className="relative w-full" style={{ aspectRatio: aspect }}>
        <Image
          src={photo.src}
          alt={photo.alt}
          fill
          sizes={sizes}
          priority={priority}
          className="object-cover"
        />
      </div>
    </PolaroidFrame>
  );
}
