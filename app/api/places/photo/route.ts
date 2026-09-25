import { NextResponse } from "next/server";
import { z } from "zod";
import { fail } from "@/lib/api";
import { serverEnv } from "@/lib/env";
import { notFound } from "@/lib/errors";

const querySchema = z.object({
  name: z.string().trim().min(1).max(400).regex(/^places\/[^/]+\/photos\/[^/]+$/),
});

/**
 * Proxies a Places photo so the server key is never exposed to the browser.
 * Cached aggressively because photo references are stable.
 */
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const { name } = querySchema.parse({ name: url.searchParams.get("name") ?? "" });
    const key = serverEnv.googleMapsServerKey;
    if (!key) throw notFound("No photo available.");

    const response = await fetch(
      `https://places.googleapis.com/v1/${name}/media?maxWidthPx=800&key=${key}`,
      { redirect: "follow", next: { revalidate: 60 * 60 * 24 * 30 } },
    );
    if (!response.ok || !response.body) throw notFound("No photo available.");

    return new NextResponse(response.body, {
      headers: {
        "content-type": response.headers.get("content-type") ?? "image/jpeg",
        "cache-control": "public, max-age=2592000, immutable",
      },
    });
  } catch (error) {
    return fail(error);
  }
}
