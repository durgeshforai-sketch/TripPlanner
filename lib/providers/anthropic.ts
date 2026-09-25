import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { demoModeRequested, serverEnv } from "@/lib/env";
import { explainDeterministically, type Explanation, type ExplanationInput } from "@/lib/recommendation/explain";

export interface AIProvider {
  readonly source: "anthropic" | "deterministic";
  explain(input: ExplanationInput): Promise<Explanation>;
}

const responseSchema = z.object({
  reasons: z.array(z.string().min(1).max(220)).min(2).max(4),
  compromise: z.string().max(260).nullable(),
});

const SYSTEM = `You write short, honest explanations for a group travel decision tool.

Rules you must follow:
- Do not invent facts. Use only the values given to you.
- Do not modify any numerical value. Copy figures exactly as supplied.
- Do not claim live availability, live prices, or anything not present in the input.
- Explain trade-offs clearly and name the person who is compromising.
- If an option is a compromise, say so plainly. Never oversell.
- Write like a thoughtful friend, not a brochure. No exclamation marks, no "paradise", no "gem".
- British-neutral English. Indian rupee amounts stay formatted exactly as given.

Return ONLY JSON: {"reasons": string[2-4], "compromise": string|null}`;

class AnthropicProvider implements AIProvider {
  readonly source = "anthropic" as const;
  private client: Anthropic;

  constructor(apiKey: string) {
    this.client = new Anthropic({ apiKey, maxRetries: 1, timeout: 20_000 });
  }

  async explain(input: ExplanationInput): Promise<Explanation> {
    const fallback = explainDeterministically(input);
    try {
      const message = await this.client.messages.create({
        model: serverEnv.anthropicModel,
        max_tokens: 700,
        system: SYSTEM,
        messages: [{ role: "user", content: JSON.stringify(buildFacts(input), null, 2) }],
      });

      const text = message.content
        .map((block) => (block.type === "text" ? block.text : ""))
        .join("")
        .trim();

      const json = text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1);
      const parsed = responseSchema.parse(JSON.parse(json) as unknown);
      return { reasons: parsed.reasons, compromise: parsed.compromise, source: "ai" };
    } catch (error) {
      console.warn("[anthropic] falling back to deterministic explanation", error);
      return fallback;
    }
  }
}

class DeterministicProvider implements AIProvider {
  readonly source = "deterministic" as const;
  async explain(input: ExplanationInput): Promise<Explanation> {
    return explainDeterministically(input);
  }
}

/** Structured, already-computed facts. The model never sees raw preferences. */
function buildFacts(input: ExplanationInput): Record<string, unknown> {
  return {
    destination: `${input.destination.name}, ${input.destination.country}`,
    destinationSummary: input.destination.description,
    dates: `${input.dates.start} to ${input.dates.end}`,
    durationDays: input.duration,
    estimatedPerPersonINR: { min: input.perPersonMin, max: input.perPersonMax },
    groupSize: input.memberCount,
    membersItWorksWellFor: input.membersSatisfied,
    stylesItCovers: input.matchedStyles,
    travelHoursEachWay: input.travelHoursRange,
    unresolvedGroupConflicts: input.conflicts,
    perMember: input.individualFit.map((fit) => ({
      name: fit.memberName,
      fit: fit.status,
      matches: fit.matchedPreferences,
      conflicts: fit.conflicts,
    })),
  };
}

export function getAIProvider(): AIProvider {
  const key = serverEnv.anthropicKey;
  // Demo mode stays fully deterministic even when a key is present.
  if (!key || demoModeRequested) return new DeterministicProvider();
  return new AnthropicProvider(key);
}
