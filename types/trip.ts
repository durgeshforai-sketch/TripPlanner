export type TripStatus =
  | "collecting"
  | "analyzing"
  | "deciding"
  | "confirmed";

export type MemberRole = "owner" | "participant";
export type MemberStatus = "invited" | "joined" | "submitted";

export interface Trip {
  id: string;
  name: string;
  description: string | null;
  inviteCode: string;
  status: TripStatus;
  expectedMembers: number;
  ownerMemberId: string | null;
  /** Storage path of the group photo shown on the trip, if someone set one. */
  coverPhotoPath: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Member {
  id: string;
  tripId: string;
  name: string;
  role: MemberRole;
  status: MemberStatus;
  createdAt: string;
  updatedAt: string;
}

/** The trip as the current participant is allowed to see it. */
export interface TripView {
  trip: Trip;
  members: Member[];
  me: Member;
  submittedCount: number;
  allSubmitted: boolean;
}
