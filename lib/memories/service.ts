import "server-only";
import { randomUUID } from "node:crypto";
import { db } from "@/lib/db/supabase";
import { AppError, badRequest, forbidden, notFound } from "@/lib/errors";
import {
  countMemories,
  deleteMemoryRow,
  getMemoryRow,
  insertMemoryRow,
  listMemoryRows,
  setTripCoverPhoto,
} from "@/lib/db/repo";
import type { Membership } from "@/lib/auth/session";
import type { Memory, MemoryWall } from "@/types/memory";

export const MEMORY_BUCKET = "tripsync-memories";

export const MEMORY_LIMITS = {
  /** Browsers compress to ~0.5 MB first; this is the ceiling for anything that slips past. */
  maxBytes: 4 * 1024 * 1024,
  /** Keeps one trip well inside the free Storage tier. */
  perTrip: 300,
  captionLength: 140,
  /** Signed URLs outlive a page view comfortably but are useless if shared later. */
  signedUrlSeconds: 60 * 60,
} as const;

type ImageType = "image/jpeg" | "image/png" | "image/webp";

const EXTENSION: Record<ImageType, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

/**
 * The browser's declared type is a suggestion. The first bytes are the truth,
 * so a renamed file or anything that is not a photo is refused here.
 */
export function sniffImageType(bytes: Uint8Array): ImageType | null {
  if (bytes.length < 12) return null;
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a
  ) {
    return "image/png";
  }
  const ascii = (from: number, to: number) => String.fromCharCode(...bytes.slice(from, to));
  if (ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP") return "image/webp";
  return null;
}

interface UploadedImage {
  bytes: Uint8Array;
  type: ImageType;
}

export async function readImage(file: FormDataEntryValue | null): Promise<UploadedImage> {
  if (!file || typeof file === "string") throw badRequest("Choose a photo to upload.");
  if (file.size === 0) throw badRequest("That file is empty.");
  if (file.size > MEMORY_LIMITS.maxBytes) {
    throw badRequest("That photo is too large. Try one under 4 MB.");
  }
  const bytes = new Uint8Array(await file.arrayBuffer());
  const type = sniffImageType(bytes);
  if (!type) throw badRequest("Only JPG, PNG or WebP photos can go on the wall.");
  return { bytes, type };
}

function storage() {
  return db().storage.from(MEMORY_BUCKET);
}

async function putObject(path: string, image: UploadedImage): Promise<void> {
  const { error } = await storage().upload(path, image.bytes, {
    contentType: image.type,
    cacheControl: "31536000",
    upsert: false,
  });
  if (error) {
    throw new AppError("unavailable", "We could not store that photo. Try again in a moment.", {
      storage: error.message,
    });
  }
}

async function removeObjects(paths: string[]): Promise<void> {
  if (paths.length === 0) return;
  const { error } = await storage().remove(paths);
  // An orphaned file costs a few hundred KB; failing the user's action over it
  // would be worse. Log it and move on.
  if (error) console.warn("[memories] could not remove objects", paths, error.message);
}

/** One round trip for every URL on the page. Missing entries map to null. */
async function signUrls(paths: string[]): Promise<Map<string, string>> {
  const urls = new Map<string, string>();
  if (paths.length === 0) return urls;
  const { data, error } = await storage().createSignedUrls(paths, MEMORY_LIMITS.signedUrlSeconds);
  if (error) throw new AppError("unavailable", "Photos are unavailable right now.", error);
  for (const entry of data ?? []) {
    if (entry.path && entry.signedUrl) urls.set(entry.path, entry.signedUrl);
  }
  return urls;
}

export async function signedUrlFor(path: string | null): Promise<string | null> {
  if (!path) return null;
  try {
    return (await signUrls([path])).get(path) ?? null;
  } catch (error) {
    console.warn("[memories] could not sign cover photo", error);
    return null;
  }
}

export async function loadMemoryWall(membership: Membership): Promise<MemoryWall> {
  const nameById = new Map(membership.members.map((m) => [m.id, m.name]));
  try {
    const rows = await listMemoryRows(membership.trip.id);
    const urls = await signUrls(rows.map((row) => row.storage_path));
    const memories: Memory[] = rows.flatMap((row) => {
      const url = urls.get(row.storage_path);
      if (!url) return [];
      return [
        {
          id: row.id,
          url,
          caption: row.caption,
          memberId: row.member_id,
          memberName: row.member_id ? (nameById.get(row.member_id) ?? null) : null,
          width: row.width,
          height: row.height,
          createdAt: row.created_at,
        },
      ];
    });
    return { memories, available: true, limit: MEMORY_LIMITS.perTrip };
  } catch (error) {
    console.warn("[memories] wall unavailable", error);
    return { memories: [], available: false, limit: MEMORY_LIMITS.perTrip };
  }
}

function dimension(value: FormDataEntryValue | null): number | null {
  if (typeof value !== "string") return null;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed >= 1 && parsed <= 10_000 ? parsed : null;
}

export async function addMemory(membership: Membership, form: FormData): Promise<Memory> {
  const tripId = membership.trip.id;
  const image = await readImage(form.get("file"));

  const rawCaption = form.get("caption");
  const caption = typeof rawCaption === "string" ? rawCaption.trim().replace(/\s+/g, " ") : "";
  if (caption.length > MEMORY_LIMITS.captionLength) {
    throw badRequest(`Keep the caption under ${MEMORY_LIMITS.captionLength} characters.`);
  }

  if ((await countMemories(tripId)) >= MEMORY_LIMITS.perTrip) {
    throw badRequest(`The wall is full at ${MEMORY_LIMITS.perTrip} photos. Remove a few first.`);
  }

  const path = `${tripId}/${randomUUID()}.${EXTENSION[image.type]}`;
  await putObject(path, image);

  try {
    const row = await insertMemoryRow({
      tripId,
      memberId: membership.member.id,
      storagePath: path,
      caption: caption || null,
      contentType: image.type,
      sizeBytes: image.bytes.byteLength,
      width: dimension(form.get("width")),
      height: dimension(form.get("height")),
    });
    const url = (await signUrls([path])).get(path) ?? "";
    return {
      id: row.id,
      url,
      caption: row.caption,
      memberId: row.member_id,
      memberName: membership.member.name,
      width: row.width,
      height: row.height,
      createdAt: row.created_at,
    };
  } catch (error) {
    await removeObjects([path]);
    throw error;
  }
}

/** Whoever pinned a photo can take it down, and so can the organiser. */
export async function removeMemory(membership: Membership, memoryId: string): Promise<void> {
  const row = await getMemoryRow(membership.trip.id, memoryId);
  if (!row) throw notFound("That photo is no longer on the wall.");
  if (!membership.isOwner && row.member_id !== membership.member.id) {
    throw forbidden("Only the person who added this photo, or the organiser, can remove it.");
  }
  await deleteMemoryRow(row.id);
  await removeObjects([row.storage_path]);
}

export async function replaceCoverPhoto(
  membership: Membership,
  form: FormData,
): Promise<string | null> {
  const tripId = membership.trip.id;
  const image = await readImage(form.get("file"));
  const path = `${tripId}/cover-${randomUUID()}.${EXTENSION[image.type]}`;
  await putObject(path, image);

  try {
    await setTripCoverPhoto(tripId, path);
  } catch (error) {
    await removeObjects([path]);
    throw error;
  }
  if (membership.trip.coverPhotoPath) await removeObjects([membership.trip.coverPhotoPath]);
  return signedUrlFor(path);
}

export async function clearCoverPhoto(membership: Membership): Promise<void> {
  const previous = membership.trip.coverPhotoPath;
  await setTripCoverPhoto(membership.trip.id, null);
  if (previous) await removeObjects([previous]);
}
