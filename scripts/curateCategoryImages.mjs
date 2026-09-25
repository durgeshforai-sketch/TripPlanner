/**
 * One representative photograph per activity category, so an activity card
 * always shows a picture of the *kind of thing* it is when we have no photo of
 * the specific place. A beach idea shows a beach; a food idea shows food.
 *
 * Usage: node scripts/curateCategoryImages.mjs [category ...]
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";

const API = "https://commons.wikimedia.org/w/api.php";
const UA = "Tripsync/1.0 (educational project)";

/**
 * Commons categories are curated by people, so membership actually matches the
 * subject. Free-text search does not: searching "beach" returned a scanned
 * nursery catalogue whose title merely contained the word "tropical".
 */
const CATEGORIES = {
  beach: ["Category:Sandy beaches", "Category:Beaches by country"],
  nature: ["Category:Waterfalls", "Category:Forests"],
  sightseeing: ["Category:Tourist attractions", "Category:Landmarks"],
  culture: ["Category:Hindu temples", "Category:Museum interiors"],
  food: ["Category:Street food", "Category:Food markets"],
  nightlife: ["Category:Bars (establishments)", "Category:Nightclubs"],
  shopping: ["Category:Marketplaces", "Category:Bazaars"],
  adventure: ["Category:Whitewater rafting", "Category:Sea kayaking"],
  relaxed: ["Category:Swimming pools of hotels", "Category:Hammocks"],
};

const REJECT =
  /map|locator|flag|seal|coat[_ ]of[_ ]arms|logo|emblem|diagram|chart|\.svg$|\.pdf$|\.tif$|painting|drawing|engrav|lithograph|watercolo|sketch|banner|,_1[5-9]\d\d/i;

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

async function find(categories) {
  const titles = [];
  for (const category of categories) {
    const members = await api({
      action: "query",
      list: "categorymembers",
      cmtitle: category,
      cmtype: "file",
      cmlimit: "24",
    });
    titles.push(...(members.query?.categorymembers ?? []).map((m) => ({ title: m.title })));
    await sleep(600);
  }

  for (const hit of titles) {
    if (REJECT.test(hit.title)) continue;
    if (!/\.(jpe?g|png)$/i.test(hit.title)) continue;

    const info = await api({
      action: "query",
      titles: hit.title,
      prop: "imageinfo",
      iiprop: "url|size|extmetadata",
      iiurlwidth: "1200",
    });
    const image = Object.values(info.query?.pages ?? {})[0]?.imageinfo?.[0];
    if (!image) continue;
    if (image.width < 900 || image.width / image.height < 1.25) continue;

    const meta = image.extmetadata ?? {};
    const licence = meta.LicenseShortName?.value ?? "";
    if (/fair use|non-free/i.test(licence)) continue;

    return {
      url: (image.thumburl ?? image.url).split("?")[0],
      width: image.thumbwidth ?? image.width,
      height: image.thumbheight ?? image.height,
      credit: strip(meta.Artist?.value) || "Wikimedia Commons",
      licence: licence || "See Wikimedia Commons",
      source: `https://commons.wikimedia.org/wiki/${encodeURIComponent(hit.title)}`,
    };
  }
  return null;
}

const out = "data/categoryImages.json";
const existing = existsSync(out) ? JSON.parse(readFileSync(out, "utf8")) : {};
const only = process.argv.slice(2);

for (const category of only.length ? only : Object.keys(CATEGORIES)) {
  try {
    const found = await find(CATEGORIES[category]);
    if (found) {
      existing[category] = found;
      console.log(`✓ ${category.padEnd(12)} ${decodeURIComponent(found.url.split("/").pop()).slice(0, 60)}`);
    } else {
      console.log(`✗ ${category.padEnd(12)} nothing usable`);
    }
  } catch (error) {
    console.log(`! ${category.padEnd(12)} ${error.message}`);
  }
  await sleep(1200);
}

writeFileSync(out, `${JSON.stringify(existing, null, 2)}\n`);
console.log(`\n${Object.keys(existing).length} of ${Object.keys(CATEGORIES).length} categories covered.`);
