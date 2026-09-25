/**
 * Generates docs/component-map.svg from a description of the real structure.
 *
 * Layout is computed top-down rather than hand-placed, so adding a row to a box
 * grows its band instead of silently clipping the row below it.
 */
import { writeFileSync } from "node:fs";

const C = {
  ink: "#17143a", inkSoft: "#5b5878", inkFaint: "#8b88a6",
  primary: "#5b4be8", primarySoft: "#ede9ff", primaryLine: "#c9c1f6",
  accent: "#e05a3c", accentSoft: "#fdeae4",
  green: "#12915a", greenSoft: "#e4f7ec",
  amber: "#b7791f", amberSoft: "#fff3dc",
  blue: "#2b7fd4", blueSoft: "#e6f1fd",
  band: "#f6f4fe", border: "#e9e5f8", white: "#ffffff", bg: "#fbfaff",
};

const W = 1780;
const M = 40;
const CW = W - M * 2;
const PAD = 18;
const LINE = 18;

const out = [];
const esc = (t) =>
  String(t).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const text = (x, y, t, { size = 12, weight = 400, fill = C.inkSoft, anchor = "start", spacing } = {}) =>
  out.push(
    `<text x="${x}" y="${y}" font-size="${size}" font-weight="${weight}" fill="${fill}"` +
      `${anchor !== "start" ? ` text-anchor="${anchor}"` : ""}` +
      `${spacing ? ` letter-spacing="${spacing}"` : ""}>${esc(t)}</text>`,
  );

const rect = (x, y, w, h, { r = 12, fill = C.white, stroke = C.border } = {}) =>
  out.push(`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${fill}"${stroke ? ` stroke="${stroke}"` : ""}/>`);

/** A titled card whose height is derived from how many lines it holds. */
const cardHeight = (lines) => 40 + lines * LINE + 12;

function card(x, y, w, title, lines, accent) {
  const h = cardHeight(lines.length);
  rect(x, y, w, h);
  out.push(`<rect x="${x}" y="${y}" width="4" height="${h}" rx="2" fill="${accent}"/>`);
  text(x + 14, y + 24, title, { size: 14, weight: 700, fill: C.ink });
  lines.forEach((line, i) => text(x + 14, y + 46 + i * LINE, line));
  return h;
}

function chip(x, y, w, label, bg, fg) {
  rect(x, y, w, 28, { r: 14, fill: bg, stroke: null });
  text(x + w / 2, y + 19, label, { size: 12.5, weight: 700, fill: fg, anchor: "middle" });
}

/** Lays out a band and returns the y for whatever comes next. */
function band(y, title, subtitle, contentHeight, draw) {
  const headH = subtitle ? 52 : 36;
  const h = headH + contentHeight + PAD;
  rect(M, y, CW, h, { r: 18, fill: C.band });
  text(M + PAD, y + 28, title.toUpperCase(), { size: 13, weight: 800, fill: C.inkFaint, spacing: 1.5 });
  if (subtitle) text(M + PAD, y + 46, subtitle, { size: 12, fill: C.inkFaint });
  draw(y + headH);
  return y + h;
}

function connector(y, label) {
  const x = W / 2;
  out.push(`<line x1="${x}" y1="${y + 8}" x2="${x}" y2="${y + 30}" stroke="${C.primaryLine}" stroke-width="2.5" marker-end="url(#a)"/>`);
  if (label) text(x + 12, y + 26, label, { size: 11.5, fill: C.inkFaint });
  return y + 42;
}

// ----------------------------------------------------------------- header
out.push(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} HEIGHT" width="${W}" height="HEIGHT" font-family="ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif">`,
  `<defs><marker id="a" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0 L10 5 L0 10 z" fill="${C.primaryLine}"/></marker></defs>`,
  `<rect width="${W}" height="HEIGHT" fill="${C.bg}"/>`,
);
text(M, 54, "Tripsync — component map", { size: 31, weight: 800, fill: C.ink, spacing: -0.6 });
text(M, 80, "Group travel decision engine. Collect preferences → find the overlap → score what is possible → explain trade-offs → the group decides.", { size: 14 });

[["Keyless by default", C.greenSoft, C.green], ["Optional paid key", C.amberSoft, C.amber], ["Persisted", C.blueSoft, C.blue]]
  .forEach(([label, bg, fg], i) => chip(W - M - (3 - i) * 176 + 16, 36, 164, label, bg, fg));

let y = 110;

// ------------------------------------------------------------- 1 · pages
const pagesA = [["/", "Landing"], ["/create", "Create or join"], ["/join/[inviteCode]", "Join a trip"], ["/trip/[tripId]", "Dashboard"], ["…/invite", "Share the link"], ["…/preferences", "8-step flow"]];
const pagesB = [["…/waiting", "Who has answered"], ["…/results", "Top 3 + snapshot"], ["…/compare", "Side by side"], ["…/option/[optionId]", "6 detail tabs"], ["…/decision", "Vote + runoff"], ["…/confirmed", "Final plan"]];
const pw = (CW - PAD * 2 - 5 * 22) / 6;

y = band(y, "1 · App Router pages", "Server Components by default; client only where the screen is interactive", 52 * 2 + 14 + 26, (top) => {
  [pagesA, pagesB].forEach((row, r) =>
    row.forEach(([name, desc], i) => {
      const x = M + PAD + i * (pw + 22);
      const by = top + r * 66;
      rect(x, by, pw, 52, { r: 10 });
      text(x + 12, by + 22, name, { size: 12.5, weight: 700, fill: C.ink });
      text(x + 12, by + 39, desc, { size: 11.5, fill: C.inkFaint });
    }),
  );
  text(M + PAD, top + 152, "components/ · ui · trip · preferences · calendar · recommendations · flights · activities · map · illustrations", { size: 11.5, fill: C.inkFaint });
});
y = connector(y, "fetch · one envelope shape");

// ------------------------------------------------------------ 2 · routes
const apis = [
  ["Trips & membership", ["POST /api/trips", "POST …/[tripId]/join", "GET …/[tripId] · /members"]],
  ["Preferences", ["GET/POST …/preferences", "own answers always,", "group answers when all in"]],
  ["Recommendations", ["POST …/recommendations", "GET …/recommendations", "GET …/[optionId]"]],
  ["Decision", ["POST …/decision/vote", "POST …/decision/finalize", "GET …/decision"]],
  ["Lookup", ["/api/places/* · /api/routes", "/api/activities · /api/holidays", "/api/flights/search"]],
];
const aw = (CW - PAD * 2 - 4 * 20) / 5;
y = band(y, "2 · Route handlers", "Every body validated with Zod · failures normalised to { ok:false, error } · provider errors never reach the browser", cardHeight(3), (top) =>
  apis.forEach(([t, lines], i) => card(M + PAD + i * (aw + 20), top, aw, t, lines, C.primary)),
);
y = connector(y, "authorise, then compute");

// ------------------------------------------------------------ 3 · domain
const domains = [
  ["Access & state", C.accent, ["auth/session.ts — 256-bit token,", "SHA-256 at rest, cookie per trip", "db/repo.ts · rows.ts — typed reads", "trips/readiness.ts — is the group", "actually complete?", "decision/service.ts — tally, tie,", "one runoff", "validation/*.ts — Zod schemas"]],
  ["Recommendation engine", C.primary, ["config.ts — every weight & threshold", "dates.ts — candidate windows, overlap", "candidates.ts — destination pool", "scoring.ts — hard constraints first,", "then 7 weighted dimensions", "select.ts — pure shortlist (no I/O)", "analysis.ts — group snapshot", "enrich.ts · engine.ts — orchestration", "explain.ts — deterministic wording"]],
  ["Getting there", C.green, ["transport/model.ts", "  fly · train · bus · self-drive", "  <300 km → road leads, flight", "  marked as not worth it", "  no flight to your own airport", "  choice = cost + time priced in", "transport/build.ts — per origin city", "recommendation/travel.ts — origins"]],
  ["Supporting", C.blue, ["holidays/longWeekends.ts —", "  derived, never fetched", "itinerary/generate.ts — rough plan", "http.ts — timeout, retry only on", "  transient faults, bounded fan-out", "api.ts · errors.ts — safe envelopes", "config.ts — product naming"]],
];
const dw = (CW - PAD * 2 - 3 * 16) / 4;
y = band(y, "3 · Domain logic (lib/)", "Pure, testable modules — no React, no vendor SDKs", cardHeight(9), (top) =>
  domains.forEach(([t, accent, lines], i) => card(M + PAD + i * (dw + 16), top, dw, t, lines, accent)),
);
y = connector(y, "depends on interfaces, never on vendors");

// -------------------------------------------------------- 4 · interfaces
const ifaces = ["PlaceProvider", "RouteProvider", "ActivityProvider", "FlightProvider", "HolidayProvider", "AIProvider"];
const iw = (CW - PAD * 2 - 5 * 22) / 6;
y = band(y, "4 · Provider interfaces", "The replaceable seam — swapping a vendor touches nothing above this line", 38, (top) =>
  ifaces.forEach((name, i) => {
    const x = M + PAD + i * (iw + 22);
    rect(x, top, iw, 36, { r: 10, fill: C.primarySoft, stroke: C.primaryLine });
    text(x + iw / 2, top + 23, name, { size: 13, weight: 700, fill: C.primary, anchor: "middle" });
  }),
);

// ----------------------------------------------------- 5 · implementations
const impls = [
  [["Photon + Nominatim", "g"], ["Google Places", "a"], ["Demo", "r"]],
  [["OSRM", "g"], ["Google Routes", "a"], ["Demo", "r"]],
  [["Overpass (OSM)", "g"], ["Google Places", "a"], ["Demo", "r"]],
  [["Distance estimate", "g"], ["Duffel · Amadeus", "a"], ["Demo", "r"]],
  [["Curated IN + Nager", "g"], null, ["Local fixed dates", "r"]],
  [["Deterministic text", "g"], ["Anthropic", "a"], null],
];
const TONE = { g: [C.greenSoft, C.green], a: [C.amberSoft, C.amber], r: [C.accentSoft, C.accent] };
y = band(y, "5 · Implementations", "lib/providers/index.ts picks one: paid key if present → free service → labelled sample data", 3 * 32 + 4, (top) =>
  impls.forEach((options, i) =>
    options.forEach((option, j) => {
      if (!option) return;
      const [label, tone] = option;
      chip(M + PAD + i * (iw + 22), top + j * 32, iw, label, ...TONE[tone]);
    }),
  ),
);
y = connector(y);

// ---------------------------------------------------------- 6 · the world
const world = [
  [520, "Static data (data/)", C.blue, ["destinations.ts — 46 curated candidates", "airports.ts — 67 airports + coordinates", "destinationImages.json — one photo each", "categoryImages.json — beach, food, nature…", "localHolidays.ts — curated IN 2026/27", "", "Photos: Wikimedia Commons, free licences,", "credited wherever they appear."]],
  [560, "Free, keyless services", C.green, ["photon.komoot.io — type-ahead", "nominatim.openstreetmap.org — geocoding", "router.project-osrm.org — road distance", "overpass-api.de — real places to go", "tile.openstreetmap.org — Leaflet tiles", "date.nager.at — public holidays", "", "Community-run and often busy: short", "timeouts, a mirror, and always a fallback."]],
  [290, "Optional, paid", C.amber, ["Google Places (New)", "Google Routes", "Duffel — live airfares", "Amadeus — alternative", "Anthropic — wording only", "", "None required.", "No free live-fare source exists."]],
  [0, "Supabase Postgres", C.blue, ["schema: tripsync", "trips · members", "participant_sessions · preferences", "recommendation_runs", "recommendation_options", "option_member_fits", "decisions · decision_votes", "", "RLS on, no policies — server key only."]],
];
y = band(y, "6 · Data and the outside world", null, cardHeight(9), (top) => {
  let x = M + PAD;
  const gap = 20;
  const fixed = world.slice(0, 3).reduce((sum, [w]) => sum + w, 0);
  world.forEach(([w, title, accent, lines], i) => {
    const width = i === 3 ? CW - PAD * 2 - fixed - gap * 3 : w;
    card(x, top, width, title, lines, accent);
    x += width + gap;
  });
});

text(M, y + 34, "Runs with zero API keys. The LLM never selects destinations or produces numbers — it only rewrites an explanation already computed. 131 tests cover scoring, transport, readiness, auth and voting.", { size: 12, fill: C.inkFaint });

const H = y + 60;
out.push("</svg>");
writeFileSync("docs/component-map.svg", out.join("\n").replaceAll("HEIGHT", String(H)));
console.log(`docs/component-map.svg — ${W}x${H}`);
