import { describe, expect, it } from "vitest";
import { readImage, sniffImageType } from "@/lib/memories/service";

const pad = (head: number[]) => new Uint8Array([...head, ...new Array(16).fill(0)]);

const JPEG = pad([0xff, 0xd8, 0xff, 0xe0]);
const PNG = pad([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const WEBP = new Uint8Array([
  ...Array.from("RIFF", (c) => c.charCodeAt(0)),
  0x24, 0, 0, 0,
  ...Array.from("WEBPVP8 ", (c) => c.charCodeAt(0)),
  ...new Array(8).fill(0),
]);

describe("memory wall uploads", () => {
  it("recognises photos by their bytes, not their name", () => {
    expect(sniffImageType(JPEG)).toBe("image/jpeg");
    expect(sniffImageType(PNG)).toBe("image/png");
    expect(sniffImageType(WEBP)).toBe("image/webp");
  });

  it("refuses anything that is not a photo", () => {
    const html = new TextEncoder().encode("<html><script>alert(1)</script></html>");
    const svg = new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg"></svg>');
    const gif = pad(Array.from("GIF89a", (c) => c.charCodeAt(0)));
    expect(sniffImageType(html)).toBeNull();
    expect(sniffImageType(svg)).toBeNull();
    expect(sniffImageType(gif)).toBeNull();
    expect(sniffImageType(new Uint8Array(4))).toBeNull();
  });

  it("does not trust a photo-looking name or declared type", async () => {
    const disguised = new File(["<script>alert(1)</script>".padEnd(64, " ")], "beach.jpg", {
      type: "image/jpeg",
    });
    await expect(readImage(disguised)).rejects.toThrow(/Only JPG, PNG or WebP/);
  });

  it("rejects missing, empty and oversized files with a readable message", async () => {
    await expect(readImage(null)).rejects.toThrow(/Choose a photo/);
    await expect(readImage("not-a-file")).rejects.toThrow(/Choose a photo/);
    await expect(readImage(new File([], "empty.jpg"))).rejects.toThrow(/empty/);
    const huge = new File([new Uint8Array(4 * 1024 * 1024 + 1)], "huge.jpg");
    await expect(readImage(huge)).rejects.toThrow(/too large/);
  });

  it("accepts a real photo", async () => {
    const photo = new File([JPEG], "us.jpg", { type: "image/jpeg" });
    await expect(readImage(photo)).resolves.toMatchObject({ type: "image/jpeg" });
  });
});
