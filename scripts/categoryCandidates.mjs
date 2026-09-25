/**
 * Builds a contact sheet of candidate photographs per activity category so the
 * choice can be made by looking at the images rather than trusting filenames.
 *
 * Writes public/_candidates.html and data/categoryCandidates.json.
 */
import { writeFileSync, mkdirSync } from "node:fs";

const API = "https://commons.wikimedia.org/w/api.php";
const UA = "Tripsync/1.0 (educational project)";

const QUERIES = {
  beach: "beach palm trees turquoise water tropical shore",
  nature: "waterfall forest landscape",
  sightseeing: "famous monument landmark architecture",
  culture: "temple architecture carved",
  food: "street food stall cooking vendor",
  nightlife: "bar nightlife neon evening",
  shopping: "bazaar market stalls shopping",
  adventure: "white water rafting river",
  relaxed: "hotel swimming pool deck chairs",
};

const REJECT =
  /map|locator|flag|seal|coat[_ ]of[_ ]arms|logo|emblem|diagram|chart|\.svg$|\.pdf$|\.tif$|painting|drawing|engrav|lithograph|watercolo|sketch|banner|catalogue|price_list|poster|book|page|thumbnail\.jpg/i;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function api(params, attempt = 0) {
  const url = `${API}?${new URLSearchParams({ format: "json", origin: "*", ...params })}`;
  const response = await fetch(url, { headers: { "User-Agent": UA } });
  if (response.status === 429 && attempt < 6) {
    await sleep(Math.min(30_000, 2000 * 2 ** attempt));
    return api(params, attempt + 1);
  }
  if (!response.ok) throw new Error(`Commons ${response.status}`);
  return response.json();
}

const strip = (v) => (v ?? "").replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim().slice(0, 120);

async function candidates(query, want = 3) {
  const search = await api({
    action: "query",
    list: "search",
    srsearch: `${query} filetype:bitmap`,
    srnamespace: "6",
    srlimit: "25",
  });

  const found = [];
  for (const hit of search.query?.search ?? []) {
    if (found.length >= want) break;
    if (REJECT.test(hit.title)) continue;

    const info = await api({
      action: "query",
      titles: hit.title,
      prop: "imageinfo",
      iiprop: "url|size|extmetadata",
      iiurlwidth: "900",
    });
    const image = Object.values(info.query?.pages ?? {})[0]?.imageinfo?.[0];
    if (!image) continue;
    if (image.width < 800 || image.width / image.height < 1.2) continue;

    const meta = image.extmetadata ?? {};
    const licence = meta.LicenseShortName?.value ?? "";
    if (/fair use|non-free/i.test(licence)) continue;

    found.push({
      title: hit.title,
      url: (image.thumburl ?? image.url).split("?")[0],
      width: image.thumbwidth ?? image.width,
      height: image.thumbheight ?? image.height,
      credit: strip(meta.Artist?.value) || "Wikimedia Commons",
      licence: licence || "See Wikimedia Commons",
      source: `https://commons.wikimedia.org/wiki/${encodeURIComponent(hit.title)}`,
    });
    await sleep(350);
  }
  return found;
}

import { existsSync, readFileSync } from "node:fs";

const only = process.argv.slice(2);
const all =
  only.length && existsSync("data/categoryCandidates.json")
    ? JSON.parse(readFileSync("data/categoryCandidates.json", "utf8"))
    : {};

for (const [category, query] of Object.entries(QUERIES)) {
  if (only.length && !only.includes(category)) continue;
  all[category] = await candidates(query);
  console.log(`${category.padEnd(12)} ${all[category].length} candidates`);
  await sleep(900);
}

mkdirSync("public", { recursive: true });
writeFileSync("data/categoryCandidates.json", `${JSON.stringify(all, null, 2)}\n`);

const rows = Object.entries(all)
  .map(
    ([category, list]) => `
  <section>
    <h2>${category}</h2>
    <div class="row">
      ${list
        .map(
          (c, i) =>
            `<figure><img src="${c.url}" loading="eager"><figcaption>${i}</figcaption></figure>`,
        )
        .join("")}
    </div>
  </section>`,
  )
  .join("");

writeFileSync(
  "public/_candidates.html",
  `<!doctype html><meta charset="utf-8"><title>candidates</title>
<style>
 body{font:13px system-ui;margin:0;padding:12px;background:#fff}
 h2{margin:10px 0 4px;font-size:14px;text-transform:uppercase;letter-spacing:.08em}
 .row{display:flex;gap:6px}
 figure{margin:0;flex:1}
 img{width:100%;height:110px;object-fit:cover;border-radius:6px;display:block}
 figcaption{text-align:center;font-weight:700}
</style>${rows}`,
);
console.log("\nOpen /_candidates.html to review.");
