import { describe, expect, it } from "vitest";
import { assessReadiness } from "@/lib/trips/readiness";
import { makePreference } from "./factories";
import type { Member, Trip } from "@/types/trip";

const trip = (expectedMembers: number): Trip => ({
  id: "trip-1",
  name: "Durgesh's Birthday Trip",
  description: null,
  inviteCode: "CODE",
  status: "collecting",
  expectedMembers,
  coverPhotoPath: null,
  ownerMemberId: "m-0",
  createdAt: "2026-09-20T00:00:00.000Z",
  updatedAt: "2026-09-20T00:00:00.000Z",
});

const member = (index: number): Member => ({
  id: `m-${index}`,
  tripId: "trip-1",
  name: `Member ${index}`,
  role: index === 0 ? "owner" : "participant",
  status: "joined",
  createdAt: "2026-09-20T00:00:00.000Z",
  updatedAt: "2026-09-20T00:00:00.000Z",
});

const submitted = (index: number, at = "2026-09-21T00:00:00.000Z") =>
  makePreference({ memberId: `m-${index}`, submittedAt: at });

describe("readiness is measured against the people invited", () => {
  it("does not call a five-person trip ready when only two have joined and answered", () => {
    const readiness = assessReadiness({
      trip: trip(5),
      members: [member(0), member(1)],
      preferences: [submitted(0), submitted(1)],
    });

    expect(readiness.everyoneSubmitted).toBe(true);
    // The regression: everyone who joined had answered, but three were missing.
    expect(readiness.canGenerate).toBe(false);
    expect(readiness.awaitingJoiners).toBe(3);
    expect(readiness.blockReason).toContain("not joined yet");
  });

  it("is ready when everyone invited has joined and answered", () => {
    const members = [0, 1, 2].map(member);
    const readiness = assessReadiness({
      trip: trip(3),
      members,
      preferences: [submitted(0), submitted(1), submitted(2)],
    });
    expect(readiness.canGenerate).toBe(true);
    expect(readiness.blockReason).toBeNull();
  });

  it("names who the group is still waiting on", () => {
    const members = [0, 1, 2].map(member);
    const readiness = assessReadiness({
      trip: trip(3),
      members,
      preferences: [submitted(0)],
    });
    expect(readiness.canGenerate).toBe(false);
    expect(readiness.pendingMembers.map((m) => m.name)).toEqual(["Member 1", "Member 2"]);
    expect(readiness.blockReason).toContain("Member 1 and Member 2");
  });

  it("reports both problems when people are missing and silent", () => {
    const readiness = assessReadiness({
      trip: trip(4),
      members: [member(0), member(1)],
      preferences: [submitted(0)],
    });
    expect(readiness.blockReason).toContain("Member 1");
    expect(readiness.blockReason).toContain("not joined yet");
  });

  it("copes with more people joining than were expected", () => {
    const members = [0, 1, 2].map(member);
    const readiness = assessReadiness({
      trip: trip(2),
      members,
      preferences: [submitted(0), submitted(1), submitted(2)],
    });
    expect(readiness.expected).toBe(3);
    expect(readiness.awaitingJoiners).toBe(0);
    expect(readiness.canGenerate).toBe(true);
  });
});

describe("going ahead without everyone", () => {
  it("is offered once two people have answered", () => {
    const readiness = assessReadiness({
      trip: trip(5),
      members: [member(0), member(1)],
      preferences: [submitted(0), submitted(1)],
    });
    expect(readiness.canGenerateAnyway).toBe(true);
  });

  it("is not offered with a single answer", () => {
    const readiness = assessReadiness({
      trip: trip(5),
      members: [member(0), member(1)],
      preferences: [submitted(0)],
    });
    expect(readiness.canGenerateAnyway).toBe(false);
  });
});

describe("stale runs", () => {
  it("flags a run that predates someone's answers", () => {
    const readiness = assessReadiness({
      trip: trip(3),
      members: [0, 1, 2].map(member),
      preferences: [
        submitted(0, "2026-09-21T00:00:00.000Z"),
        submitted(1, "2026-09-21T00:00:00.000Z"),
        submitted(2, "2026-09-23T00:00:00.000Z"),
      ],
      runCreatedAt: "2026-09-22T00:00:00.000Z",
    });
    expect(readiness.hasStaleRun).toBe(true);
    expect(readiness.membersMissingFromRun.map((m) => m.name)).toEqual(["Member 2"]);
  });

  it("does not flag a run that already includes everyone", () => {
    const readiness = assessReadiness({
      trip: trip(2),
      members: [member(0), member(1)],
      preferences: [submitted(0), submitted(1)],
      runCreatedAt: "2026-09-22T00:00:00.000Z",
    });
    expect(readiness.hasStaleRun).toBe(false);
  });

  it("does not flag anything when there is no run", () => {
    const readiness = assessReadiness({
      trip: trip(2),
      members: [member(0), member(1)],
      preferences: [submitted(0), submitted(1)],
    });
    expect(readiness.hasStaleRun).toBe(false);
    expect(readiness.membersMissingFromRun).toEqual([]);
  });
});
