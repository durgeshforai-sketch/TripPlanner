/**
 * Who this copy of Tripsync is for. The landing page, placeholders and sample
 * data all read from here, so handing it to a different group is one edit (or
 * one env var) rather than a find-and-replace.
 */
const DEFAULT_MEMBERS = ["Durgesh", "Kajal", "Mihir", "Nandita"];

function membersFromEnv(): string[] {
  const raw = process.env.NEXT_PUBLIC_GROUP_MEMBERS;
  if (!raw) return DEFAULT_MEMBERS;
  const names = raw
    .split(",")
    .map((name) => name.trim())
    .filter(Boolean);
  return names.length >= 2 ? names : DEFAULT_MEMBERS;
}

export interface Photo {
  src: string;
  alt: string;
  width: number;
  height: number;
  credit: string;
  source: string;
}

const members = membersFromEnv();

const WORDS = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten"];

export const GROUP = {
  members,
  /** "Durgesh, Kajal, Mihir & Nandita" */
  roll: members.length > 1 ? `${members.slice(0, -1).join(", ")} & ${members.at(-1)}` : members[0],
  organiser: members[0],
  /** "four", for "the four of us". Falls back to digits past ten. */
  countWord: WORDS[members.length] ?? String(members.length),
  /**
   * The group photo on the landing page. Drop a real one at
   * `public/group/cover.jpg` and point this at it; until then a stand-in of
   * four friends on a hilltop keeps the spot warm.
   */
  cover: {
    src: "https://thumb.wikimedia.org/wikipedia/commons/thumb/a/a1/Kamenjak_hikers_%28Unsplash%29.jpg/1920px-Kamenjak_hikers_%28Unsplash%29.jpg",
    alt: "Four friends silhouetted on a hilltop at dusk",
    width: 1920,
    height: 1281,
    credit: "Filip Filkovic Philatz",
    source: "https://commons.wikimedia.org/wiki/File:Kamenjak_hikers_(Unsplash).jpg",
  } satisfies Photo,
} as const;

/** Written in our own voice, one shown per day so the page does not feel static. */
export const NUDGES = [
  "The group chat is not a trip.",
  "Someday is not a day of the week.",
  "We will never be this free again. Book it.",
  "Nobody ever looks back and wishes they had stayed in.",
  "Four calendars, one long weekend. It exists — let's find it.",
  "The best stories start with “okay, but what if we just went?”",
  "Leave is use-it-or-lose-it. So are we.",
];

export function nudgeForToday(date = new Date()): string {
  const start = Date.UTC(date.getUTCFullYear(), 0, 0);
  const day = Math.floor((date.getTime() - start) / 86_400_000);
  return NUDGES[day % NUDGES.length];
}

const THUMB = "https://thumb.wikimedia.org/wikipedia/commons/thumb";

function scrap(path: string, alt: string, credit: string, width: number, height: number): Photo {
  const file = path.split("/").pop() as string;
  return {
    src: `${THUMB}/${path}/1280px-${file}`,
    alt,
    width: 1280,
    height: Math.round((1280 * height) / width),
    credit,
    source: `https://commons.wikimedia.org/wiki/File:${decodeURIComponent(file)}`,
  };
}

/**
 * Group-travel photography for the scrapbook. All CC0 (Unsplash contributors,
 * mirrored on Wikimedia Commons), credited in the page footer anyway.
 */
export const SCRAPBOOK: (Photo & { caption: string })[] = [
  {
    ...scrap("d/d2/Wasting_The_Day_Away_%28Unsplash%29.jpg", "A group of friends silhouetted against a sunset", "Nick Abrams", 3910, 2528),
    caption: "sunsets we didn't plan for",
  },
  {
    ...scrap("4/43/Road_trip_%28Unsplash%29.jpg", "A vintage camper van parked on a leafy road", "Epicurrence", 3000, 2000),
    caption: "the van. obviously.",
  },
  {
    ...scrap("3/3e/Backpackers_%28Unsplash%29.jpg", "Friends with backpacks on a mountain trail", "Ashim D’Silva", 3072, 2048),
    caption: "“it's only 2 km more”",
  },
  {
    ...scrap("7/7f/Cooking_While_Camping_%28Unsplash%29.jpg", "Vegetables cooking in a pan over a campfire", "Dan Edwards", 5012, 3341),
    caption: "dinner, one pan, zero complaints",
  },
  {
    ...scrap("6/66/Joshua_Tree_hikers_resting_%28Unsplash%29.jpg", "Friends resting on rocks watching the sun go down", "Cynthia Magana", 6000, 4000),
    caption: "the quiet bit after the climb",
  },
  {
    ...scrap("9/99/Evening_car_trip_%28Unsplash%29.jpg", "A dashboard view of a highway at dusk", "Patrick Tomasso", 4592, 3448),
    caption: "4 a.m. playlists",
  },
  {
    ...scrap("c/c6/Hikers_at_peak_%28Unsplash%29.jpg", "Hikers scrambling up a rocky summit", "Mathias Jensen", 5445, 3630),
    caption: "summit or bust",
  },
  {
    ...scrap("a/a3/A_group_of_friends_on_a_casual_hike.jpg", "A group of friends walking down a country road", "Altitonantis", 6000, 4000),
    caption: "walking nowhere in particular",
  },
];
