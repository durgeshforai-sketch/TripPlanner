import { NextRequest } from "next/server";
import { handle, ok } from "@/lib/api";
import { forbidden } from "@/lib/errors";
import { requireMembership } from "@/lib/auth/session";
import { savePreferenceSchema } from "@/lib/validation/preferences";
import { getPreference, listPreferences, savePreference } from "@/lib/db/repo";

/** A member can always read their own answers; the group's only after everyone submits. */
export async function GET(request: Request, { params }: { params: Promise<{ tripId: string }> }) {
  return handle(async () => {
    const { tripId } = await params;
    const { member, members } = await requireMembership(tripId);

    const url = new URL(request.url);
    if (url.searchParams.get("scope") === "group") {
      const all = await listPreferences(tripId);
      const submitted = all.filter((p) => p.submittedAt !== null);
      if (submitted.length < members.length) {
        throw forbidden("The group's answers open up once everyone has submitted.");
      }
      return ok({ preferences: submitted });
    }

    return ok({ preference: await getPreference(tripId, member.id) });
  });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tripId: string }> },
) {
  return handle(async () => {
    const { tripId } = await params;
    const { member } = await requireMembership(tripId);

    const { submit, preference } = savePreferenceSchema.parse(await request.json());
    // Members may only ever write their own row — the id comes from the session,
    // never from the request body.
    const saved = await savePreference(tripId, member.id, preference, submit);

    return ok({ preference: saved, submitted: saved.submittedAt !== null });
  });
}
