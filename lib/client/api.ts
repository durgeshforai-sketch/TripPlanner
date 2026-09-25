"use client";

export interface ApiError {
  code: string;
  message: string;
  issues?: { path: string; message: string }[];
}

export class ApiCallError extends Error {
  readonly code: string;
  readonly issues: { path: string; message: string }[];

  constructor(error: ApiError) {
    super(error.message);
    this.name = "ApiCallError";
    this.code = error.code;
    this.issues = error.issues ?? [];
  }
}

/** Single place the client talks to our API, so error shapes stay consistent. */
export async function apiFetch<T>(
  input: string,
  init?: RequestInit & { json?: unknown },
): Promise<T> {
  const { json, ...rest } = init ?? {};
  const response = await fetch(input, {
    ...rest,
    headers: json ? { "content-type": "application/json", ...rest.headers } : rest.headers,
    body: json !== undefined ? JSON.stringify(json) : rest.body,
  });

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new ApiCallError({ code: "internal", message: "We could not reach the server." });
  }

  const envelope = payload as { ok?: boolean; data?: T; error?: ApiError };
  if (!response.ok || envelope.ok !== true) {
    throw new ApiCallError(
      envelope.error ?? { code: "internal", message: "Something went wrong." },
    );
  }
  return envelope.data as T;
}
