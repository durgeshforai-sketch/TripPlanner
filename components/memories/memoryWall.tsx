"use client";

import * as React from "react";
import { format } from "date-fns";
import { Camera, ExternalLink, ImagePlus, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Notice } from "@/components/ui/states";
import { PolaroidFrame } from "@/components/journal/polaroid";
import { apiFetch, ApiCallError } from "@/lib/client/api";
import { prepareImage } from "@/lib/client/images";
import { cn } from "@/lib/utils";
import type { Memory, MemoryWall as MemoryWallData } from "@/types/memory";

const CAPTION_LIMIT = 140;
const MAX_BATCH = 20;

interface Staged {
  key: string;
  file: File;
  preview: string;
  caption: string;
  error?: string;
}

/** Same photo, same angle, every visit — random tilts would jump on each render. */
function tiltFor(id: string): number {
  let hash = 0;
  for (const char of id) hash = (hash * 31 + char.charCodeAt(0)) | 0;
  return ((Math.abs(hash) % 9) - 4) * 0.8;
}

function errorText(error: unknown): string {
  if (error instanceof ApiCallError || error instanceof Error) return error.message;
  return "Something went wrong. Try again.";
}

export function MemoryWall({
  tripId,
  meId,
  isOwner,
  wall,
}: {
  tripId: string;
  meId: string;
  isOwner: boolean;
  wall: MemoryWallData;
}) {
  const [memories, setMemories] = React.useState<Memory[]>(wall.memories);
  const [staged, setStaged] = React.useState<Staged[]>([]);
  const [progress, setProgress] = React.useState<{ done: number; total: number } | null>(null);
  const [notice, setNotice] = React.useState<string | null>(null);
  const [openId, setOpenId] = React.useState<string | null>(null);
  const [removing, setRemoving] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  // Object URLs hold the whole file in memory; release them when a preview goes.
  const stagedRef = React.useRef(staged);
  React.useEffect(() => {
    stagedRef.current = staged;
  }, [staged]);
  React.useEffect(
    () => () => stagedRef.current.forEach((item) => URL.revokeObjectURL(item.preview)),
    [],
  );

  const open = memories.find((memory) => memory.id === openId) ?? null;
  const uploading = progress !== null;
  const roomLeft = Math.max(0, wall.limit - memories.length);

  function pick(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []).filter((file) =>
      file.type.startsWith("image/") || /\.(heic|heif)$/i.test(file.name),
    );
    event.target.value = "";
    if (files.length === 0) return;

    const allowed = Math.min(MAX_BATCH - staged.length, roomLeft - staged.length);
    if (files.length > allowed) {
      setNotice(
        allowed <= 0
          ? "That is as many as fit for now — pin these first."
          : `Only the first ${allowed} were added. Pin these, then add more.`,
      );
    } else {
      setNotice(null);
    }
    const next = files.slice(0, Math.max(0, allowed)).map((file) => ({
      key: `${file.name}-${file.lastModified}-${Math.random().toString(36).slice(2)}`,
      file,
      preview: URL.createObjectURL(file),
      caption: "",
    }));
    setStaged((current) => [...current, ...next]);
  }

  function unstage(key: string) {
    setStaged((current) => {
      const item = current.find((entry) => entry.key === key);
      if (item) URL.revokeObjectURL(item.preview);
      return current.filter((entry) => entry.key !== key);
    });
  }

  async function pinAll() {
    const queue = staged;
    setProgress({ done: 0, total: queue.length });
    setNotice(null);

    // One at a time: kinder to phones on patchy data, and a failure only costs
    // that one photo, which stays in the tray to retry.
    for (const [index, item] of queue.entries()) {
      try {
        const image = await prepareImage(item.file);
        const form = new FormData();
        form.set("file", image.blob, "photo.jpg");
        form.set("caption", item.caption.trim());
        form.set("width", String(image.width));
        form.set("height", String(image.height));
        const { memory } = await apiFetch<{ memory: Memory }>(
          `/api/trips/${tripId}/memories`,
          { method: "POST", body: form },
        );
        setMemories((current) => [memory, ...current]);
        unstage(item.key);
      } catch (error) {
        setStaged((current) =>
          current.map((entry) =>
            entry.key === item.key ? { ...entry, error: errorText(error) } : entry,
          ),
        );
      }
      setProgress({ done: index + 1, total: queue.length });
    }
    setProgress(null);
  }

  async function remove(memory: Memory) {
    if (!window.confirm("Take this photo off the wall for everyone? This cannot be undone.")) {
      return;
    }
    setRemoving(true);
    try {
      await apiFetch(`/api/trips/${tripId}/memories/${memory.id}`, { method: "DELETE" });
      setMemories((current) => current.filter((entry) => entry.id !== memory.id));
      setOpenId(null);
    } catch (error) {
      setNotice(errorText(error));
    } finally {
      setRemoving(false);
    }
  }

  return (
    <section id="memories" aria-labelledby="memories-title" className="scroll-mt-24">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 id="memories-title" className="text-3xl sm:text-4xl">
            Memory wall
          </h2>
          <p className="mt-1 font-hand text-2xl text-ink-faint">
            photos from last time — and every trip after
          </p>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="image/*,.heic,.heif"
          multiple
          className="sr-only"
          onChange={pick}
          tabIndex={-1}
          aria-hidden
        />
        <Button
          variant="accent"
          onClick={() => inputRef.current?.click()}
          disabled={!wall.available || uploading || roomLeft === 0}
        >
          <ImagePlus className="h-4 w-4" aria-hidden />
          Add photos
        </Button>
      </div>

      {!wall.available ? (
        <Notice tone="warning" className="mt-6">
          The photo wall could not be reached just now. Nothing is lost — refresh in a minute.
        </Notice>
      ) : null}
      {notice ? (
        <Notice tone="info" className="mt-6">
          {notice}
        </Notice>
      ) : null}

      {staged.length > 0 ? (
        <div className="card mt-6 p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="font-medium">
              {staged.length} {staged.length === 1 ? "photo" : "photos"} ready to pin
              <span className="ml-2 text-sm font-normal text-ink-faint">
                Add a caption if you like
              </span>
            </p>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                disabled={uploading}
                onClick={() => staged.forEach((item) => unstage(item.key))}
              >
                Clear
              </Button>
              <Button size="sm" onClick={pinAll} loading={uploading}>
                {progress
                  ? `Pinning ${Math.min(progress.done + 1, progress.total)} of ${progress.total}…`
                  : `Pin ${staged.length === 1 ? "it" : `all ${staged.length}`} to the wall`}
              </Button>
            </div>
          </div>
          <ul className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {staged.map((item) => (
              <li key={item.key} className="space-y-2">
                <div className="relative overflow-hidden rounded-md bg-bg-tint">
                  {/* eslint-disable-next-line @next/next/no-img-element -- local object URL preview */}
                  <img src={item.preview} alt="" className="aspect-square w-full object-cover" />
                  <button
                    type="button"
                    onClick={() => unstage(item.key)}
                    disabled={uploading}
                    aria-label={`Remove ${item.file.name}`}
                    className="absolute right-1.5 top-1.5 rounded-full bg-black/55 p-1 text-white hover:bg-black/75"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
                <input
                  value={item.caption}
                  maxLength={CAPTION_LIMIT}
                  disabled={uploading}
                  onChange={(event) =>
                    setStaged((current) =>
                      current.map((entry) =>
                        entry.key === item.key ? { ...entry, caption: event.target.value } : entry,
                      ),
                    )
                  }
                  placeholder="caption…"
                  aria-label={`Caption for ${item.file.name}`}
                  className="w-full border-b border-dashed border-border-strong bg-transparent px-0.5 py-1 font-hand text-xl outline-none placeholder:text-ink-faint focus:border-primary"
                />
                {item.error ? <p className="text-xs text-notfit">{item.error}</p> : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {memories.length === 0 && wall.available ? (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="mt-8 flex w-full flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-border-strong px-6 py-14 text-center transition-colors hover:border-primary/60 hover:bg-surface/60"
        >
          <Camera className="h-8 w-8 text-ink-faint" aria-hidden />
          <span className="font-serif text-2xl font-semibold">Nothing pinned yet</span>
          <span className="max-w-md text-ink-soft">
            Got photos from the last trip? Pin them here so everyone has them — and so we remember
            why we are doing this again.
          </span>
        </button>
      ) : (
        <ul className="mt-10 columns-2 gap-5 sm:columns-3 sm:gap-7 lg:columns-4">
          {memories.map((memory, index) => (
            <li key={memory.id} className="mb-8 break-inside-avoid">
              <button
                type="button"
                onClick={() => setOpenId(memory.id)}
                className="block w-full text-left"
                aria-label={memory.caption ? `Open photo: ${memory.caption}` : "Open photo"}
              >
                <PolaroidFrame
                  tilt={tiltFor(memory.id)}
                  tape={index % 3 === 0 ? "top" : "none"}
                  interactive
                  delay={Math.min(index, 8) * 50}
                  caption={
                    <span className="flex flex-col items-center">
                      {memory.caption ? <span>{memory.caption}</span> : null}
                      <span
                        className={cn(
                          "text-base text-[#7a6d62]",
                          !memory.caption && "text-lg",
                        )}
                      >
                        {memory.memberName ?? "someone"} · {format(new Date(memory.createdAt), "d MMM")}
                      </span>
                    </span>
                  }
                >
                  {/* eslint-disable-next-line @next/next/no-img-element -- short-lived signed Storage URL */}
                  <img
                    src={memory.url}
                    alt={memory.caption ?? `Photo added by ${memory.memberName ?? "a member"}`}
                    width={memory.width ?? undefined}
                    height={memory.height ?? undefined}
                    loading="lazy"
                    decoding="async"
                    className="h-auto w-full"
                  />
                </PolaroidFrame>
              </button>
            </li>
          ))}
        </ul>
      )}

      <Dialog open={open !== null} onOpenChange={(value) => (value ? null : setOpenId(null))}>
        {open ? (
          <DialogContent
            title={open.caption ?? "A memory"}
            description={`Pinned by ${open.memberName ?? "someone who has since left"} on ${format(new Date(open.createdAt), "d MMMM yyyy")}`}
            className="max-w-3xl"
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- short-lived signed Storage URL */}
            <img
              src={open.url}
              alt={open.caption ?? "Trip photo"}
              className="max-h-[62vh] w-full rounded-lg bg-bg-tint object-contain"
            />
            <div className="mt-4 flex flex-wrap justify-between gap-3">
              <Button asChild variant="secondary" size="sm">
                <a href={open.url} target="_blank" rel="noreferrer">
                  <ExternalLink className="h-4 w-4" aria-hidden />
                  Full size
                </a>
              </Button>
              {isOwner || open.memberId === meId ? (
                <Button variant="danger" size="sm" onClick={() => remove(open)} loading={removing}>
                  <Trash2 className="h-4 w-4" aria-hidden />
                  Take it down
                </Button>
              ) : null}
            </div>
          </DialogContent>
        ) : null}
      </Dialog>
    </section>
  );
}
