import { beforeEach, describe, expect, it, vi } from "vitest";

const cookieStore = new Map<string, string>();

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) =>
      cookieStore.has(name) ? { name, value: cookieStore.get(name) } : undefined,
    set: (name: string, value: string) => cookieStore.set(name, value),
  }),
}));

const sessions = new Map<
  string,
  { tripId: string; memberId: string; role: "owner" | "participant" }
>();
const members = new Map<string, { id: string; tripId: string; role: "owner" | "participant" }>();
const trips = new Set<string>();

vi.mock("@/lib/db/repo", () => ({
  createSession: vi.fn(async (input: { tokenHash: string; tripId: string; memberId: string; role: "owner" | "participant" }) => {
    sessions.set(input.tokenHash, {
      tripId: input.tripId,
      memberId: input.memberId,
      role: input.role,
    });
  }),
  findSession: vi.fn(async (hash: string) => sessions.get(hash) ?? null),
  getMember: vi.fn(async (id: string) => {
    const member = members.get(id);
    return member
      ? {
          ...member,
          name: id,
          status: "joined",
          createdAt: "",
          updatedAt: "",
        }
      : null;
  }),
  getTrip: vi.fn(async (id: string) =>
    trips.has(id)
      ? {
          id,
          name: "Trip",
          description: null,
          inviteCode: "CODE",
          status: "collecting",
          expectedMembers: 5,
          ownerMemberId: null,
          createdAt: "",
          updatedAt: "",
        }
      : null,
  ),
  listMembers: vi.fn(async (tripId: string) =>
    Array.from(members.values())
      .filter((m) => m.tripId === tripId)
      .map((m) => ({ ...m, name: m.id, status: "joined", createdAt: "", updatedAt: "" })),
  ),
}));

const { generateInviteCode, generateToken, getMembership, hashToken, requireMembership, requireOwner, startSession } =
  await import("@/lib/auth/session");
const { AppError } = await import("@/lib/errors");

beforeEach(() => {
  cookieStore.clear();
  sessions.clear();
  members.clear();
  trips.clear();
  trips.add("trip-a");
  trips.add("trip-b");
  members.set("member-a", { id: "member-a", tripId: "trip-a", role: "owner" });
  members.set("member-b", { id: "member-b", tripId: "trip-b", role: "participant" });
});

describe("tokens", () => {
  it("issues tokens that are not guessable and never repeat", () => {
    const issued = new Set(Array.from({ length: 200 }, () => generateToken()));
    expect(issued.size).toBe(200);
    expect(generateToken().length).toBeGreaterThanOrEqual(43);
  });

  it("issues invite codes that are random and URL-safe", () => {
    const codes = Array.from({ length: 200 }, () => generateInviteCode());
    expect(new Set(codes).size).toBe(200);
    expect(codes.every((c) => /^[A-Z2-9]{12}$/.test(c))).toBe(true);
  });

  it("stores only a hash, never the raw token", async () => {
    await startSession("trip-a", "member-a", "owner");
    const raw = cookieStore.get("ts_s_trip-a");
    expect(raw).toBeTruthy();
    expect(sessions.has(raw as string)).toBe(false);
    expect(sessions.has(hashToken(raw as string))).toBe(true);
  });
});

describe("participant authorisation", () => {
  it("resolves the member behind a valid cookie", async () => {
    await startSession("trip-a", "member-a", "owner");
    const membership = await getMembership("trip-a");
    expect(membership?.member.id).toBe("member-a");
    expect(membership?.isOwner).toBe(true);
  });

  it("refuses a trip the caller has no session for", async () => {
    await startSession("trip-a", "member-a", "owner");
    expect(await getMembership("trip-b")).toBeNull();
    await expect(requireMembership("trip-b")).rejects.toBeInstanceOf(AppError);
  });

  it("refuses a token replayed against another trip", async () => {
    await startSession("trip-a", "member-a", "owner");
    // Copy the cookie across as an attacker would.
    cookieStore.set("ts_s_trip-b", cookieStore.get("ts_s_trip-a") as string);
    expect(await getMembership("trip-b")).toBeNull();
  });

  it("refuses an unknown token", async () => {
    cookieStore.set("ts_s_trip-a", generateToken());
    expect(await getMembership("trip-a")).toBeNull();
  });

  it("refuses when there is no cookie at all", async () => {
    expect(await getMembership("trip-a")).toBeNull();
    await expect(requireMembership("trip-a")).rejects.toMatchObject({ code: "unauthorized" });
  });

  it("keeps owner-only actions away from participants", async () => {
    members.set("member-c", { id: "member-c", tripId: "trip-a", role: "participant" });
    await startSession("trip-a", "member-c", "participant");
    await expect(requireOwner("trip-a")).rejects.toMatchObject({ code: "forbidden" });
  });

  it("allows owner-only actions for the organiser", async () => {
    await startSession("trip-a", "member-a", "owner");
    await expect(requireOwner("trip-a")).resolves.toMatchObject({ isOwner: true });
  });
});
