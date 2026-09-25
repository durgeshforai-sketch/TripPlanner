import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { AppError } from "@/lib/errors";

export function ok<T>(data: T, init?: ResponseInit): NextResponse {
  return NextResponse.json({ ok: true, data }, init);
}

/**
 * Normalises every failure into `{ ok: false, error: { code, message } }`.
 * Third-party error text never reaches the browser — it is logged instead.
 */
export function fail(error: unknown): NextResponse {
  if (error instanceof ZodError) {
    const issues = error.issues.map((i) => ({
      path: i.path.join("."),
      message: i.message,
    }));
    return NextResponse.json(
      { ok: false, error: { code: "bad_request", message: "Some details need fixing.", issues } },
      { status: 400 },
    );
  }

  if (error instanceof AppError) {
    if (error.status >= 500) console.error("[app-error]", error.code, error.message, error.details);
    return NextResponse.json(
      { ok: false, error: { code: error.code, message: error.message } },
      { status: error.status },
    );
  }

  console.error("[unhandled]", error);
  return NextResponse.json(
    { ok: false, error: { code: "internal", message: "Something went wrong on our side." } },
    { status: 500 },
  );
}

export async function handle(fn: () => Promise<NextResponse>): Promise<NextResponse> {
  try {
    return await fn();
  } catch (error) {
    return fail(error);
  }
}
