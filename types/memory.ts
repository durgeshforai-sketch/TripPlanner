/** A photo on the trip's memory wall, as a member is allowed to see it. */
export interface Memory {
  id: string;
  /** Short-lived signed URL. Never stored; re-issued on every read. */
  url: string;
  caption: string | null;
  memberId: string | null;
  /** Who pinned it, or null if they have since left the trip. */
  memberName: string | null;
  width: number | null;
  height: number | null;
  createdAt: string;
}

export interface MemoryWall {
  memories: Memory[];
  /** False when Storage could not be reached, so the UI can say so honestly. */
  available: boolean;
  limit: number;
}
