"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ImageUp, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PolaroidFrame } from "@/components/journal/polaroid";
import { apiFetch, ApiCallError } from "@/lib/client/api";
import { prepareImage } from "@/lib/client/images";
import type { Photo } from "@/lib/group";

/**
 * The group photo at the top of a trip. Anyone on the trip can swap it — it is
 * meant to be *our* photo, the one that makes everyone want to go.
 */
export function CoverPhoto({
  tripId,
  url,
  fallback,
  caption,
}: {
  tripId: string;
  url: string | null;
  fallback: Photo;
  caption: string;
}) {
  const router = useRouter();
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [current, setCurrent] = React.useState(url);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function upload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const image = await prepareImage(file, 2400);
      const form = new FormData();
      form.set("file", image.blob, "cover.jpg");
      const result = await apiFetch<{ url: string | null }>(`/api/trips/${tripId}/cover`, {
        method: "PUT",
        body: form,
      });
      setCurrent(result.url);
      router.refresh();
    } catch (caught) {
      setError(
        caught instanceof ApiCallError || caught instanceof Error
          ? caught.message
          : "That photo could not be used.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function reset() {
    setBusy(true);
    setError(null);
    try {
      await apiFetch(`/api/trips/${tripId}/cover`, { method: "DELETE" });
      setCurrent(null);
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not reset the photo.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative">
      <PolaroidFrame tilt={2} tape="corners" caption={caption}>
        {/* eslint-disable-next-line @next/next/no-img-element -- signed Storage URL or a Commons stand-in */}
        <img
          src={current ?? fallback.src}
          alt={current ? "Our group photo" : fallback.alt}
          className="aspect-[5/4] w-full object-cover"
        />
        {busy ? (
          <div className="absolute inset-0 flex items-center justify-center bg-black/35 font-hand text-2xl text-white">
            developing…
          </div>
        ) : null}
      </PolaroidFrame>

      <input
        ref={inputRef}
        type="file"
        accept="image/*,.heic,.heif"
        className="sr-only"
        onChange={upload}
        tabIndex={-1}
        aria-hidden
      />
      <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
        <Button
          variant="secondary"
          size="sm"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
        >
          <ImageUp className="h-4 w-4" aria-hidden />
          {current ? "Change our photo" : "Use our own photo"}
        </Button>
        {current ? (
          <Button variant="ghost" size="sm" onClick={reset} disabled={busy}>
            <RotateCcw className="h-4 w-4" aria-hidden />
            Reset
          </Button>
        ) : null}
      </div>
      {error ? <p className="mt-2 text-center text-sm text-notfit">{error}</p> : null}
    </div>
  );
}
