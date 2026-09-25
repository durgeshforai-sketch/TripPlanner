import { z } from "zod";
import { handle, ok } from "@/lib/api";
import { notFound } from "@/lib/errors";
import { getPlaceProvider, placesMode } from "@/lib/providers";

const querySchema = z.object({ placeId: z.string().trim().min(1).max(200) });

export async function GET(request: Request) {
  return handle(async () => {
    const url = new URL(request.url);
    const { placeId } = querySchema.parse({ placeId: url.searchParams.get("placeId") ?? "" });

    const place = await getPlaceProvider().details(placeId);
    if (!place) throw notFound("We could not find that place.");

    return ok({ place, source: placesMode() });
  });
}
