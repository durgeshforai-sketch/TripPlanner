import type { Holiday } from "@/lib/providers/types";

/**
 * Curated public holiday data.
 *
 * The free holiday APIs do not cover India, which is the product's primary
 * market, so the Indian lists below are transcribed from the Department of
 * Personnel and Training gazetted holiday notifications for 2026 and 2027 and
 * cross-checked against a second published list.
 *
 * Lunar dates (Id-ul-Fitr, Id-ul-Zuha, Muharram, Milad-un-Nabi) can shift by a
 * day on moon sighting; the UI tells people to confirm before booking.
 *
 * When a year is not curated here the provider falls back to the live API, and
 * then to fixed-date holidays only.
 */
interface CuratedHoliday {
  date: string;
  name: string;
}

const CURATED: Record<string, Record<number, CuratedHoliday[]>> = {
  IN: {
    2026: [
      { date: "2026-01-26", name: "Republic Day" },
      { date: "2026-03-04", name: "Holi" },
      { date: "2026-03-21", name: "Id-ul-Fitr" },
      { date: "2026-03-26", name: "Ram Navami" },
      { date: "2026-03-31", name: "Mahavir Jayanti" },
      { date: "2026-04-03", name: "Good Friday" },
      { date: "2026-05-01", name: "Buddha Purnima" },
      { date: "2026-05-27", name: "Id-ul-Zuha (Bakrid)" },
      { date: "2026-06-26", name: "Muharram" },
      { date: "2026-08-15", name: "Independence Day" },
      { date: "2026-08-26", name: "Milad-un-Nabi" },
      { date: "2026-09-04", name: "Janmashtami" },
      { date: "2026-10-02", name: "Gandhi Jayanti" },
      { date: "2026-10-20", name: "Dussehra" },
      { date: "2026-11-08", name: "Diwali" },
      { date: "2026-11-24", name: "Guru Nanak Jayanti" },
      { date: "2026-12-25", name: "Christmas Day" },
    ],
    2027: [
      { date: "2027-01-26", name: "Republic Day" },
      { date: "2027-03-10", name: "Id-ul-Fitr" },
      { date: "2027-03-23", name: "Holi" },
      { date: "2027-03-26", name: "Good Friday" },
      { date: "2027-04-15", name: "Ram Navami" },
      { date: "2027-04-19", name: "Mahavir Jayanti" },
      { date: "2027-05-17", name: "Id-ul-Zuha (Bakrid)" },
      { date: "2027-05-20", name: "Buddha Purnima" },
      { date: "2027-06-16", name: "Muharram" },
      { date: "2027-08-15", name: "Independence Day" },
      { date: "2027-08-25", name: "Janmashtami" },
      { date: "2027-10-02", name: "Gandhi Jayanti" },
      { date: "2027-10-09", name: "Dussehra" },
      { date: "2027-10-29", name: "Diwali" },
      { date: "2027-11-14", name: "Guru Nanak Jayanti" },
      { date: "2027-12-25", name: "Christmas Day" },
    ],
  },
};

/** Fixed-date holidays only — the last resort when nothing else is available. */
const FIXED: Record<string, { month: number; day: number; name: string }[]> = {
  IN: [
    { month: 1, day: 26, name: "Republic Day" },
    { month: 8, day: 15, name: "Independence Day" },
    { month: 10, day: 2, name: "Gandhi Jayanti" },
    { month: 12, day: 25, name: "Christmas Day" },
  ],
  TH: [
    { month: 1, day: 1, name: "New Year's Day" },
    { month: 4, day: 13, name: "Songkran" },
    { month: 12, day: 5, name: "National Day" },
    { month: 12, day: 31, name: "New Year's Eve" },
  ],
  SG: [
    { month: 1, day: 1, name: "New Year's Day" },
    { month: 5, day: 1, name: "Labour Day" },
    { month: 8, day: 9, name: "National Day" },
    { month: 12, day: 25, name: "Christmas Day" },
  ],
  AE: [
    { month: 1, day: 1, name: "New Year's Day" },
    { month: 12, day: 2, name: "National Day" },
  ],
  LK: [
    { month: 2, day: 4, name: "Independence Day" },
    { month: 12, day: 25, name: "Christmas Day" },
  ],
  NP: [{ month: 9, day: 19, name: "Constitution Day" }],
  DEFAULT: [
    { month: 1, day: 1, name: "New Year's Day" },
    { month: 12, day: 25, name: "Christmas Day" },
  ],
};

export function curatedHolidays(countryCode: string, year: number): Holiday[] | null {
  const list = CURATED[countryCode.toUpperCase()]?.[year];
  if (!list) return null;
  return list.map((h) => ({
    date: h.date,
    localName: h.name,
    name: h.name,
    countryCode: countryCode.toUpperCase(),
  }));
}

export function localHolidays(countryCode: string, year: number): Holiday[] {
  const list = FIXED[countryCode.toUpperCase()] ?? FIXED.DEFAULT;
  return list.map((h) => ({
    date: `${year}-${String(h.month).padStart(2, "0")}-${String(h.day).padStart(2, "0")}`,
    localName: h.name,
    name: h.name,
    countryCode: countryCode.toUpperCase(),
  }));
}
