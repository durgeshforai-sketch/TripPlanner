import { z } from "zod";
import { TRIP_STYLES } from "@/types/preferences";
import { TRANSPORT_MODES } from "@/types/transport";

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use a yyyy-mm-dd date")
  .refine((value) => !Number.isNaN(Date.parse(`${value}T00:00:00Z`)), "That date is not valid");

export const dateRangeSchema = z
  .object({ start: isoDate, end: isoDate })
  .refine((r) => r.start <= r.end, { message: "The range ends before it starts" });

const cleanList = (max: number, maxItems: number) =>
  z
    .array(z.string().trim().min(1).max(max))
    .max(maxItems)
    // Trim, drop blanks and de-duplicate case-insensitively, keeping first spelling.
    .transform((values) => {
      const seen = new Set<string>();
      const out: string[] = [];
      for (const value of values) {
        const key = value.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        out.push(value);
      }
      return out;
    });

export const desiredDestinationSchema = z.object({
  destinationId: z.string().trim().max(80).nullable().default(null),
  name: z.string().trim().min(1).max(120),
  placeId: z.string().trim().max(200).nullable().default(null),
  latitude: z.number().min(-90).max(90).nullable().default(null),
  longitude: z.number().min(-180).max(180).nullable().default(null),
});

export const stylePreferenceSchema = z.object({
  style: z.enum(TRIP_STYLES),
  priority: z.enum(["must", "nice", "dont-care"]),
});

export const preferenceSchema = z
  .object({
    travelScope: z.enum(["domestic", "international", "either"]),
    destinationMode: z.enum(["specific", "open"]),
    desiredDestinations: z.array(desiredDestinationSchema).max(10).default([]),

    originCity: z.string().trim().min(1, "Tell us where you're travelling from").max(120),
    originPlaceId: z.string().trim().max(200).nullable().default(null),
    originLatitude: z.number().min(-90).max(90).nullable().default(null),
    originLongitude: z.number().min(-180).max(180).nullable().default(null),
    nearestAirport: z.string().trim().max(10).nullable().default(null),

    comfortableBudget: z.coerce.number().int().min(0).max(10_000_000),
    maximumBudget: z.coerce.number().int().min(0).max(10_000_000),
    budgetFlexibility: z.enum(["low", "medium", "high"]),

    preferredDates: z.array(dateRangeSchema).max(12).default([]),
    possibleDates: z.array(dateRangeSchema).max(12).default([]),
    unavailableDates: z.array(dateRangeSchema).max(24).default([]),

    minDays: z.coerce.number().int().min(1).max(60),
    preferredDays: z.coerce.number().int().min(1).max(60),
    maxDays: z.coerce.number().int().min(1).max(60),

    tripStyles: z.array(stylePreferenceSchema).max(TRIP_STYLES.length).default([]),
    mustHaves: cleanList(60, 12).default([]),
    dealBreakers: cleanList(60, 12).default([]),

    transportModes: z
      .array(z.enum(TRANSPORT_MODES))
      .min(1, "Pick at least one way you are willing to travel")
      .default([...TRANSPORT_MODES])
      .transform((modes) => Array.from(new Set(modes))),
  })
  .refine((p) => p.maximumBudget >= p.comfortableBudget, {
    message: "Your maximum can't be lower than your comfortable budget",
    path: ["maximumBudget"],
  })
  .refine((p) => p.minDays <= p.preferredDays, {
    message: "Your ideal length can't be shorter than your minimum",
    path: ["preferredDays"],
  })
  .refine((p) => p.preferredDays <= p.maxDays, {
    message: "Your maximum can't be shorter than your ideal length",
    path: ["maxDays"],
  })
  .refine((p) => p.destinationMode === "open" || p.desiredDestinations.length > 0, {
    message: "Add at least one place, or switch to 'open to suggestions'",
    path: ["desiredDestinations"],
  })
  .refine((p) => !overlaps(p.preferredDates, p.unavailableDates), {
    message: "Some preferred dates are also marked unavailable",
    path: ["preferredDates"],
  })
  .refine((p) => !overlaps(p.possibleDates, p.unavailableDates), {
    message: "Some possible dates are also marked unavailable",
    path: ["possibleDates"],
  });

export type PreferenceSchemaInput = z.input<typeof preferenceSchema>;
export type PreferenceSchemaOutput = z.output<typeof preferenceSchema>;

export const savePreferenceSchema = z.object({
  submit: z.boolean().default(false),
  preference: preferenceSchema,
});

function overlaps(
  a: { start: string; end: string }[],
  b: { start: string; end: string }[],
): boolean {
  return a.some((x) => b.some((y) => x.start <= y.end && y.start <= x.end));
}
