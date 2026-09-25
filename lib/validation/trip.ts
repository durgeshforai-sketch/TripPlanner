import { z } from "zod";

const trimmed = (max: number) => z.string().trim().min(1).max(max);

export const createTripSchema = z.object({
  name: trimmed(120),
  description: z.string().trim().max(400).optional().transform((v) => (v ? v : null)),
  expectedMembers: z.coerce.number().int().min(2).max(20),
  ownerName: trimmed(60),
  originCity: trimmed(120),
  originPlaceId: z.string().trim().max(200).nullable().optional().default(null),
  originLatitude: z.number().min(-90).max(90).nullable().optional().default(null),
  originLongitude: z.number().min(-180).max(180).nullable().optional().default(null),
});
export type CreateTripInput = z.infer<typeof createTripSchema>;

export const joinTripSchema = z.object({
  inviteCode: z.string().trim().min(6).max(32),
  name: trimmed(60),
});
export type JoinTripInput = z.infer<typeof joinTripSchema>;

export const voteSchema = z.object({
  optionId: z.string().uuid(),
});
