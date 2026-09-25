import { z } from "zod";
import { handle, ok } from "@/lib/api";
import { getPlaceProvider, placesMode } from "@/lib/providers";

const querySchema = z.object({
  q: z.string().trim().min(2).max(120),
  kind: z.enum(["city", "destination"]).default("city"),
});

/**
 * Open by design: the origin autocomplete runs on the create-trip page, before
 * a trip or session exists. Inputs are debounced client-side and the field mask
 * is kept minimal to keep the call cheap.
 */
export async function GET(request: Request) {
  return handle(async () => {
    const url = new URL(request.url);
    const parsed = querySchema.safeParse({
      q: url.searchParams.get("q") ?? "",
      kind: url.searchParams.get("kind") ?? "city",
    });
    if (!parsed.success) return ok({ suggestions: [], source: placesMode() });

    const suggestions = await getPlaceProvider().autocomplete(parsed.data.q, parsed.data.kind);
    return ok({ suggestions, source: placesMode() });
  });
}
