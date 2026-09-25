import "server-only";
import { cookies } from "next/headers";
import { getPreference, savePreference } from "@/lib/db/repo";
import type { PreferenceInput } from "@/types/preferences";

/**
 * A member's origin is captured before the preference flow starts (creators
 * enter it at trip creation). It is kept out of the database until they open
 * the flow, so an abandoned signup does not leave a half-built preference row.
 */
export async function savePreferenceDraftOrigin(
  tripId: string,
  origin: {
    originCity: string;
    originPlaceId: string | null;
    originLatitude: number | null;
    originLongitude: number | null;
  },
): Promise<void> {
  const jar = await cookies();
  jar.set(`tt_origin_${tripId}`, JSON.stringify(origin), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function readOriginDraft(tripId: string): Promise<{
  originCity: string;
  originPlaceId: string | null;
  originLatitude: number | null;
  originLongitude: number | null;
} | null> {
  const jar = await cookies();
  const raw = jar.get(`tt_origin_${tripId}`)?.value;
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return null;
    const value = parsed as Record<string, unknown>;
    if (typeof value.originCity !== "string") return null;
    return {
      originCity: value.originCity,
      originPlaceId: typeof value.originPlaceId === "string" ? value.originPlaceId : null,
      originLatitude: typeof value.originLatitude === "number" ? value.originLatitude : null,
      originLongitude: typeof value.originLongitude === "number" ? value.originLongitude : null,
    };
  } catch {
    return null;
  }
}

export async function loadOwnPreference(tripId: string, memberId: string) {
  return getPreference(tripId, memberId);
}

export async function persistPreference(
  tripId: string,
  memberId: string,
  input: PreferenceInput,
  submit: boolean,
) {
  return savePreference(tripId, memberId, input, submit);
}
