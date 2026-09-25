import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { forbidden, unauthorized } from "@/lib/errors";
import { createSession, findSession, getMember, getTrip, listMembers } from "@/lib/db/repo";
import type { Member, Trip } from "@/types/trip";

const SESSION_DAYS = 60;

/**
 * One cookie per trip so a person can belong to several trips in one browser.
 * The cookie holds an opaque random token; only its SHA-256 hash is stored.
 */
function cookieName(tripId: string): string {
  return `ts_s_${tripId}`;
}

export function generateInviteCode(): string {
  // 12 chars of base32-ish alphabet, ~60 bits — not guessable, still typable.
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = randomBytes(12);
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
}

export function generateToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function startSession(
  tripId: string,
  memberId: string,
  role: Member["role"],
): Promise<void> {
  const token = generateToken();
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86_400_000);
  await createSession({
    tripId,
    memberId,
    role,
    tokenHash: hashToken(token),
    expiresAt: expiresAt.toISOString(),
  });

  const jar = await cookies();
  jar.set(cookieName(tripId), token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
}

export interface Membership {
  trip: Trip;
  member: Member;
  members: Member[];
  isOwner: boolean;
}

/** Returns null instead of throwing, for pages that render a "join" prompt. */
export async function getMembership(tripId: string): Promise<Membership | null> {
  const jar = await cookies();
  const token = jar.get(cookieName(tripId))?.value;
  if (!token) return null;

  const session = await findSession(hashToken(token));
  // A token is only ever valid for the trip it was issued against.
  if (!session || session.tripId !== tripId) return null;

  const [trip, member] = await Promise.all([getTrip(tripId), getMember(session.memberId)]);
  if (!trip || !member || member.tripId !== tripId) return null;

  const members = await listMembers(tripId);
  return { trip, member, members, isOwner: member.role === "owner" };
}

export async function requireMembership(tripId: string): Promise<Membership> {
  const membership = await getMembership(tripId);
  if (!membership) throw unauthorized();
  return membership;
}

export async function requireOwner(tripId: string): Promise<Membership> {
  const membership = await requireMembership(tripId);
  if (!membership.isOwner) throw forbidden("Only the trip organiser can do that.");
  return membership;
}
