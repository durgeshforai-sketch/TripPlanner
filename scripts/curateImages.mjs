/**
 * Picks one scenic, freely-licensed photograph per destination from Wikimedia
 * Commons and writes data/destinationImages.json.
 *
 * Blind "search the destination name" lookups return maps, flags and locator
 * diagrams, so each destination has a hand-written query aimed at a landmark or
 * landscape, and obvious non-photographs are filtered out.
 *
 * Usage: node scripts/curateImages.mjs [destinationId ...]
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";

const API = "https://commons.wikimedia.org/w/api.php";
const UA = "Tripsync/1.0 (educational project)";

/** Landmark-led queries give a far better hit rate than the bare place name. */
const QUERIES = {
  goa: "Palolem beach Goa",
  gokarna: "Om beach Gokarna",
  jaipur: "Hawa Mahal Jaipur",
  udaipur: "Lake Pichola Udaipur City Palace",
  jaisalmer: "Jaisalmer Fort sunset",
  manali: "Manali Himachal valley",
  kasol: "Parvati valley Kasol",
  rishikesh: "Lakshman Jhula Rishikesh Ganges",
  "leh-ladakh": "Pangong Lake Ladakh",
  shimla: "Shimla town Himalayas panorama",
  amritsar: "Golden Temple Amritsar",
  darjeeling: "Darjeeling tea garden Kanchenjunga",
  meghalaya: "Living root bridge Meghalaya",
  munnar: "Munnar tea plantation Kerala",
  alleppey: "Alleppey backwaters houseboat",
  varkala: "Varkala cliff beach Kerala",
  wayanad: "Wayanad Kerala landscape",
  coorg: "Abbey Falls Kodagu Karnataka",
  pondicherry: "Pondicherry French Quarter street",
  hampi: "Hampi Virupaksha temple boulders",
  andaman: "Radhanagar beach Havelock Andaman",
  ooty: "Ooty Nilgiri hills tea",
  mysuru: "Mysore Palace illuminated",
  bangkok: "Wat Arun Bangkok temple",
  phuket: "Phuket beach Thailand aerial",
  krabi: "Railay beach Krabi limestone",
  bali: "Tegallalang rice terrace Bali",
  singapore: "Gardens by the Bay Singapore skyline",
  "kuala-lumpur": "Petronas Towers Kuala Lumpur",
  "da-nang": "Hoi An ancient town lanterns",
  "sri-lanka": "Nine Arch Bridge Ella Sri Lanka",
  maldives: "Maldives island aerial lagoon",
  nepal: "Phewa Lake Pokhara Annapurna",
  dubai: "Burj Khalifa Dubai skyline",
  "abu-dhabi": "Sheikh Zayed Grand Mosque Abu Dhabi",
  doha: "Doha skyline Corniche Qatar",
  baku: "Icherisheher Baku old city",
  tbilisi: "Tbilisi old town Georgia",
  almaty: "Almaty mountains Kazakhstan",
  istanbul: "Hagia Sophia Istanbul",
  lisbon: "Lisbon Alfama tram viewpoint",
  prague: "Charles Bridge Prague castle",
  rome: "Colosseum Rome",
  barcelona: "Sagrada Familia Barcelona",
  amsterdam: "Amsterdam canal houses",
  interlaken: "Lake Brienz Interlaken Switzerland photograph",
};

// Maps, insignia and anything that is not a modern photograph of the place.
const REJECT =
  /map|locator|flag|seal|coat[_ ]of[_ ]arms|logo|emblem|diagram|chart|plan_|\.svg$|\.pdf$|\.tif$|blank|outline|location|district|administrative|painting|drawing|engrav|lithograph|watercolo|sketch|etching|banner|,_1[5-9]\d\d|_1[5-9]\d\d[_.)]/i;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Commons rate-limits hard, so back off rather than dropping the destination. */
async function api(params, attempt = 0) {
  const url = `${API}?${new URLSearchParams({ format: "json", origin: "*", ...params })}`;
  const response = await fetch(url, { headers: { "User-Agent": UA } });

  if (response.status === 429 && attempt < 6) {
    const wait = Math.min(30_000, 2000 * 2 ** attempt);
    process.stdout.write(`  (rate limited, waiting ${wait / 1000}s)\n`);
    await sleep(wait);
    return api(params, attempt + 1);
  }
  if (!response.ok) throw new Error(`Commons ${response.status}`);
  return response.json();
}

function stripHtml(value) {
  return (value ?? "")
    .replace(/<[^>]*>/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120);
}

async function findImage(id, query) {
  const search = await api({
    action: "query",
    list: "search",
    srsearch: `${query} filetype:bitmap`,
    srnamespace: "6",
    srlimit: "15",
  });

  const candidates = (search.query?.search ?? [])
    .map((hit) => hit.title)
    .filter((title) => !REJECT.test(title));

  for (const title of candidates) {
    const info = await api({
      action: "query",
      titles: title,
      prop: "imageinfo",
      iiprop: "url|size|extmetadata",
      iiurlwidth: "1400",
    });

    const page = Object.values(info.query?.pages ?? {})[0];
    const image = page?.imageinfo?.[0];
    if (!image) continue;

    // Scenic photographs are wide; portraits and tiny files look wrong in a card.
    if (image.width < 1000 || image.width / image.height < 1.2) continue;

    const meta = image.extmetadata ?? {};
    const licence = meta.LicenseShortName?.value ?? "";
    // Anything needing more than credit is not worth the complexity here.
    if (/fair use|non-free/i.test(licence)) continue;

    // Commons appends tracking parameters; the bare file URL is what we store.
    const clean = (image.thumburl ?? image.url).split("?")[0];

    return {
      url: clean,
      width: image.thumbwidth ?? image.width,
      height: image.thumbheight ?? image.height,
      credit: stripHtml(meta.Artist?.value) || "Wikimedia Commons",
      licence: licence || "See Wikimedia Commons",
      source: `https://commons.wikimedia.org/wiki/${encodeURIComponent(title)}`,
    };
  }
  return null;
}

const outPath = "data/destinationImages.json";
const existing = existsSync(outPath) ? JSON.parse(readFileSync(outPath, "utf8")) : {};
const only = process.argv.slice(2);
const ids = only.length > 0 ? only : Object.keys(QUERIES);

for (const id of ids) {
  try {
    const found = await findImage(id, QUERIES[id]);
    if (found) {
      existing[id] = found;
      console.log(`✓ ${id.padEnd(14)} ${found.url.slice(0, 80)}`);
    } else {
      console.log(`✗ ${id.padEnd(14)} nothing usable`);
    }
  } catch (error) {
    console.log(`! ${id.padEnd(14)} ${error.message}`);
  }
  await sleep(1200);
}

writeFileSync(outPath, `${JSON.stringify(existing, null, 2)}\n`);
console.log(`\n${Object.keys(existing).length} of ${Object.keys(QUERIES).length} destinations have artwork.`);
