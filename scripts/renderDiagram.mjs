/**
 * Rasterises docs/component-map.svg to a PNG for slides and chat.
 * The SVG is the source of truth; this is a convenience export.
 *
 * Usage: npm run diagram
 */
import sharp from "sharp";

const info = await sharp("docs/component-map.svg", { density: 150 })
  .resize(3520)
  .png({ compressionLevel: 9 })
  .toFile("docs/component-map.png");

console.log(`docs/component-map.png — ${info.width}x${info.height}`);
