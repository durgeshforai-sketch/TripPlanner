import { z } from "zod";
import { handle, ok } from "@/lib/api";
import { getHolidaysForYears } from "@/lib/providers/holidays";
import { findLongWeekends } from "@/lib/holidays/longWeekends";

const querySchema = z.object({
  country: z.string().trim().length(2).default("IN"),
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

/**
 * Holidays plus derived long-weekend windows. A provider failure degrades to the
 * offline list and says so, so the calendar always renders.
 */
export async function GET(request: Request) {
  return handle(async () => {
    const url = new URL(request.url);
    const { country, from, to } = querySchema.parse({
      country: url.searchParams.get("country") ?? "IN",
      from: url.searchParams.get("from") ?? "",
      to: url.searchParams.get("to") ?? "",
    });

    const years = Array.from(
      new Set([Number(from.slice(0, 4)), Number(to.slice(0, 4))]),
    ).filter((year) => Number.isFinite(year));

    const { holidays, source, degraded } = await getHolidaysForYears(country, years);
    const inRange = holidays.filter((holiday) => holiday.date >= from && holiday.date <= to);

    return ok({
      holidays: inRange,
      longWeekends: findLongWeekends(inRange, { from, to }),
      source,
      degraded,
    });
  });
}
