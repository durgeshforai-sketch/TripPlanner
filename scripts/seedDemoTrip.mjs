/**
 * Creates a complete five-person trip against a running server, so the whole
 * journey can be demonstrated without filling in the flow five times.
 *
 * Usage:
 *   node scripts/seedDemoTrip.mjs [baseUrl]
 *   node scripts/seedDemoTrip.mjs [baseUrl] --join <tripId> <inviteCode>
 *   node scripts/seedDemoTrip.mjs [baseUrl] --vote <tripId>
 *
 * The --join form adds the other four people to a trip you created yourself in
 * the browser, so you can walk your own part of the flow by hand. It writes
 * their sessions to .seed-sessions.json so --vote can cast their votes later,
 * letting you drive the decision from the browser as yourself.
 *
 * Each participant gets their own cookie jar, exactly as five separate browsers
 * would, so this also exercises the participant session model end to end.
 */
import { readFileSync, writeFileSync } from "node:fs";

const BASE = process.argv[2]?.startsWith("http") ? process.argv[2] : "http://localhost:3000";
const SESSION_FILE = ".seed-sessions.json";

function jar(initial = {}) {
  const cookies = new Map(Object.entries(initial));
  return {
    toJSON: () => Object.fromEntries(cookies),
    header: () =>
      [...cookies.entries()].map(([name, value]) => `${name}=${value}`).join("; "),
    absorb(response) {
      for (const raw of response.headers.getSetCookie?.() ?? []) {
        const [pair] = raw.split(";");
        const index = pair.indexOf("=");
        cookies.set(pair.slice(0, index), pair.slice(index + 1));
      }
    },
  };
}

async function call(path, { method = "GET", body, cookies } = {}) {
  const response = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      ...(body ? { "content-type": "application/json" } : {}),
      ...(cookies ? { cookie: cookies.header() } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  cookies?.absorb(response);
  const payload = await response.json();
  if (!payload.ok) {
    throw new Error(`${method} ${path} failed: ${payload.error?.message ?? response.status}`);
  }
  return payload.data;
}

const DATES = {
  long: [{ start: "2026-11-12", end: "2026-11-22" }],
  short: [{ start: "2026-11-13", end: "2026-11-18" }],
};

const PEOPLE = [
  {
    name: "Palak",
    owner: true,
    preference: {
      travelScope: "either",
      destinationMode: "open",
      desiredDestinations: [],
      originCity: "Bengaluru",
      originLatitude: 12.9716,
      originLongitude: 77.5946,
      nearestAirport: "BLR",
      comfortableBudget: 22000,
      maximumBudget: 30000,
      budgetFlexibility: "medium",
      preferredDates: DATES.long,
      possibleDates: [],
      unavailableDates: [],
      minDays: 3,
      preferredDays: 4,
      maxDays: 5,
      tripStyles: [
        { style: "beach", priority: "must" },
        { style: "food", priority: "nice" },
      ],
      mustHaves: ["Beach", "Good food"],
      dealBreakers: [],
    },
  },
  {
    name: "Riya",
    preference: {
      travelScope: "either",
      destinationMode: "open",
      desiredDestinations: [],
      originCity: "Mumbai",
      originLatitude: 19.076,
      originLongitude: 72.8777,
      nearestAirport: "BOM",
      comfortableBudget: 20000,
      maximumBudget: 25000,
      budgetFlexibility: "low",
      preferredDates: DATES.short,
      possibleDates: [{ start: "2026-11-19", end: "2026-11-22" }],
      unavailableDates: [],
      minDays: 3,
      preferredDays: 4,
      maxDays: 5,
      tripStyles: [
        { style: "beach", priority: "must" },
        { style: "relaxed", priority: "must" },
      ],
      mustHaves: ["Beach"],
      dealBreakers: ["No long travel"],
    },
  },
  {
    name: "Siddharth",
    preference: {
      travelScope: "either",
      destinationMode: "specific",
      desiredDestinations: [
        { destinationId: "goa", name: "Goa", placeId: null, latitude: 15.2993, longitude: 74.124 },
        { destinationId: "bali", name: "Bali", placeId: null, latitude: -8.4095, longitude: 115.1889 },
      ],
      originCity: "Delhi",
      originLatitude: 28.6139,
      originLongitude: 77.209,
      nearestAirport: "DEL",
      comfortableBudget: 28000,
      maximumBudget: 40000,
      budgetFlexibility: "high",
      preferredDates: DATES.long,
      possibleDates: [],
      unavailableDates: [],
      minDays: 4,
      preferredDays: 5,
      maxDays: 7,
      tripStyles: [
        { style: "nightlife", priority: "must" },
        { style: "beach", priority: "nice" },
      ],
      mustHaves: ["Nightlife", "Good food"],
      dealBreakers: [],
    },
  },
  {
    name: "Karan",
    preference: {
      travelScope: "domestic",
      destinationMode: "open",
      desiredDestinations: [],
      originCity: "Bengaluru",
      originLatitude: 12.9716,
      originLongitude: 77.5946,
      nearestAirport: "BLR",
      comfortableBudget: 15000,
      maximumBudget: 20000,
      budgetFlexibility: "low",
      preferredDates: [{ start: "2026-11-14", end: "2026-11-20" }],
      possibleDates: [],
      unavailableDates: [{ start: "2026-11-21", end: "2026-11-30" }],
      minDays: 3,
      preferredDays: 4,
      maxDays: 4,
      tripStyles: [
        { style: "nature", priority: "must" },
        { style: "adventure", priority: "nice" },
      ],
      mustHaves: ["Nature"],
      dealBreakers: ["No party destinations"],
    },
  },
  {
    name: "Aisha",
    preference: {
      travelScope: "either",
      destinationMode: "open",
      desiredDestinations: [],
      originCity: "Hyderabad",
      originLatitude: 17.385,
      originLongitude: 78.4867,
      nearestAirport: "HYD",
      comfortableBudget: 24000,
      maximumBudget: 32000,
      budgetFlexibility: "high",
      preferredDates: DATES.long,
      possibleDates: [],
      unavailableDates: [],
      minDays: 3,
      preferredDays: 4,
      maxDays: 6,
      tripStyles: [
        { style: "mixed", priority: "nice" },
        { style: "food", priority: "must" },
      ],
      mustHaves: ["Good food", "Picturesque places"],
      dealBreakers: ["No overnight buses"],
    },
  },
];

async function voteForGuests(tripId) {
  const saved = JSON.parse(readFileSync(SESSION_FILE, "utf8"));
  if (saved.tripId !== tripId) throw new Error("Saved sessions are for a different trip");

  const { run } = await call(`/api/trips/${tripId}/recommendations`, {
    cookies: jar(saved.guests[0].cookies),
  });
  if (!run || run.options.length === 0) {
    throw new Error("No options yet — generate them in the browser first");
  }

  // Deliberately not unanimous, so the vote split is worth looking at.
  const picks = [0, 0, 1, 0];
  for (const [index, guest] of saved.guests.entries()) {
    const option = run.options[picks[index] % run.options.length];
    await call(`/api/trips/${tripId}/decision/vote`, {
      method: "POST",
      body: { optionId: option.id },
      cookies: jar(guest.cookies),
    });
    console.log(`${guest.name} voted for ${option.destination.name}`);
  }
  console.log("\nNow cast your own vote in the browser and close the vote.");
}

async function main() {
  const voteIndex = process.argv.indexOf("--vote");
  if (voteIndex !== -1) {
    await voteForGuests(process.argv[voteIndex + 1]);
    return;
  }


  const joinIndex = process.argv.indexOf("--join");
  const joinExisting = joinIndex !== -1;
  const owner = PEOPLE[0];

  let tripId;
  let inviteCode;
  let ownerJar = null;

  if (joinExisting) {
    tripId = process.argv[joinIndex + 1];
    inviteCode = process.argv[joinIndex + 2];
    if (!tripId || !inviteCode) throw new Error("--join needs a trip id and an invite code");
    console.log(`Adding the rest of the group to ${tripId}`);
  } else {
    ownerJar = jar();
    ({ tripId, inviteCode } = await call("/api/trips", {
      method: "POST",
      body: {
        name: "Palak's Birthday Trip",
        description: "Beaches, good food and fun",
        expectedMembers: PEOPLE.length,
        ownerName: owner.name,
        originCity: owner.preference.originCity,
        originLatitude: owner.preference.originLatitude,
        originLongitude: owner.preference.originLongitude,
      },
      cookies: ownerJar,
    }));
    console.log(`Created trip ${tripId} (invite ${inviteCode})`);
  }

  const guests = PEOPLE.slice(1);
  const guestJars = [];
  for (const person of guests) {
    const personJar = jar();
    await call(`/api/trips/${tripId}/join`, {
      method: "POST",
      body: { inviteCode, name: person.name },
      cookies: personJar,
    });
    guestJars.push(personJar);
    console.log(`${person.name} joined`);
  }

  if (ownerJar) {
    await call(`/api/trips/${tripId}/preferences`, {
      method: "POST",
      body: { submit: true, preference: owner.preference },
      cookies: ownerJar,
    });
    console.log(`${owner.name} submitted preferences`);
  }

  for (const [index, person] of guests.entries()) {
    await call(`/api/trips/${tripId}/preferences`, {
      method: "POST",
      body: { submit: true, preference: person.preference },
      cookies: guestJars[index],
    });
    console.log(`${person.name} submitted preferences`);
  }

  if (!ownerJar) {
    writeFileSync(
      SESSION_FILE,
      JSON.stringify(
        {
          tripId,
          guests: guests.map((person, index) => ({
            name: person.name,
            cookies: guestJars[index].toJSON(),
          })),
        },
        null,
        2,
      ),
    );
    console.log(`\nSaved guest sessions to ${SESSION_FILE} for --vote later.`);
    console.log(`Everyone except you has answered. Finish your own preferences at:`);
    console.log(`  ${BASE}/trip/${tripId}/preferences`);
    return;
  }

  console.log("Generating recommendations…");
  const { run } = await call(`/api/trips/${tripId}/recommendations`, {
    method: "POST",
    cookies: ownerJar,
  });

  for (const option of run.options) {
    console.log(
      `  ${option.rank}. ${option.destination.name} — score ${option.groupScore}, works for ${option.membersSatisfied}/${option.individualFit.length}`,
    );
  }

  console.log(`\nOpen ${BASE}/join/${inviteCode} in a fresh browser to join as someone else.`);
  console.log(`Owner view: ${BASE}/trip/${tripId}/results`);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
