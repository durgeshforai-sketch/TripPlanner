/** Single source of truth for product naming. Rename here, nowhere else. */
export const PRODUCT = {
  name: process.env.NEXT_PUBLIC_APP_NAME || "Tripsync",
  tagline: "Different preferences. One trip.",
  closingLine: "Same friends. Fewer messages. More trips.",
} as const;

/**
 * Demo mode is resolved on the server from credentials as well as the flag, so a
 * deployment with no keys degrades to labelled sample data instead of failing.
 */
export const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === "true";
