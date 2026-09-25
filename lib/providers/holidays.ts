import "server-only";
import { z } from "zod";
import { fetchJson } from "@/lib/http";
import { serverEnv } from "@/lib/env";
import { curatedHolidays, localHolidays } from "@/data/localHolidays";
import type { Holiday, HolidayProvider } from "./types";

const nagerSchema = z.array(
  z.object({
    date: z.string(),
    localName: z.string(),
    name: z.string(),
    countryCode: z.string(),
  }),
);

/** Nager.Date — free and keyless, but it does not cover every country. */
class NagerHolidayProvider implements HolidayProvider {
  readonly source = "nager" as const;

  async getHolidays(countryCode: string, year: number): Promise<Holiday[]> {
    const url = `${serverEnv.holidayBaseUrl}/PublicHolidays/${year}/${countryCode.toUpperCase()}`;
    const raw = await fetchJson(url, {
      provider: "nager",
      timeoutMs: 5000,
      retries: 1,
      next: { revalidate: 60 * 60 * 24 },
    });
    // An unsupported country answers 204, which arrives here as null.
    if (raw === null) return [];
    return nagerSchema.parse(raw).map((h) => ({
      date: h.date,
      localName: h.localName,
      name: h.name,
      countryCode: h.countryCode,
    }));
  }
}

export type HolidaySource = "curated" | "nager" | "local";

export interface HolidayResult {
  holidays: Holiday[];
  source: HolidaySource;
  /** True when we are on the fixed-date fallback and coverage is incomplete. */
  degraded: boolean;
}

const cache = new Map<string, { at: number; value: HolidayResult }>();
const TTL_MS = 6 * 60 * 60 * 1000;

/**
 * Resolution order: our curated national list, then the live API, then
 * fixed-date holidays. It never throws — a failed lookup must not stop someone
 * choosing dates.
 */
export async function getHolidays(countryCode: string, year: number): Promise<HolidayResult> {
  const key = `${countryCode.toUpperCase()}-${year}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.value;

  const curated = curatedHolidays(countryCode, year);
  if (curated && curated.length > 0) {
    const value: HolidayResult = { holidays: curated, source: "curated", degraded: false };
    cache.set(key, { at: Date.now(), value });
    return value;
  }

  let result: HolidayResult;
  try {
    const holidays = await new NagerHolidayProvider().getHolidays(countryCode, year);
    result =
      holidays.length > 0
        ? { holidays, source: "nager", degraded: false }
        : { holidays: localHolidays(countryCode, year), source: "local", degraded: true };
  } catch (error) {
    console.warn(`[holidays] ${countryCode} ${year}: falling back to fixed dates`, error);
    result = { holidays: localHolidays(countryCode, year), source: "local", degraded: true };
  }

  cache.set(key, { at: Date.now(), value: result });
  return result;
}

export async function getHolidaysForYears(
  countryCode: string,
  years: number[],
): Promise<HolidayResult> {
  const results = await Promise.all(years.map((year) => getHolidays(countryCode, year)));
  const best: HolidaySource = results.some((r) => r.source === "curated")
    ? "curated"
    : results.some((r) => r.source === "nager")
      ? "nager"
      : "local";

  return {
    holidays: results.flatMap((r) => r.holidays),
    source: best,
    degraded: results.some((r) => r.degraded),
  };
}
