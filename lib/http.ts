import "server-only";

export class ProviderError extends Error {
  readonly provider: string;
  readonly status: number | null;
  /** Only transient failures are worth another attempt. */
  readonly retryable: boolean;

  constructor(
    provider: string,
    message: string,
    status: number | null = null,
    retryable = false,
  ) {
    super(message);
    this.name = "ProviderError";
    this.provider = provider;
    this.status = status;
    this.retryable = retryable;
  }
}

interface RequestOptions {
  provider: string;
  method?: "GET" | "POST";
  headers?: Record<string, string>;
  body?: unknown;
  /** Send `body` verbatim instead of JSON-encoding it (form posts, Overpass QL). */
  rawBody?: boolean;
  timeoutMs?: number;
  retries?: number;
  /** Next.js fetch cache hint, e.g. `{ revalidate: 3600 }`. */
  next?: { revalidate?: number };
}

const RETRYABLE = new Set([408, 425, 429, 500, 502, 503, 504]);

/**
 * Every outbound provider call goes through here: bounded timeout, retries only
 * for transient failures on idempotent-safe requests, and an error type that
 * never carries the provider's raw body to the browser.
 */
export async function fetchJson(url: string, options: RequestOptions): Promise<unknown> {
  const {
    provider,
    method = "GET",
    headers = {},
    body,
    rawBody = false,
    timeoutMs = 8000,
    retries = 1,
    next,
  } = options;

  let lastError: ProviderError = new ProviderError(provider, "Request never ran");

  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(url, {
        method,
        headers:
          body && !rawBody ? { "content-type": "application/json", ...headers } : headers,
        body:
          body === undefined
            ? undefined
            : rawBody
              ? String(body)
              : JSON.stringify(body),
        signal: controller.signal,
        ...(next ? { next } : { cache: "no-store" }),
      });

      if (!response.ok) {
        const retryable = RETRYABLE.has(response.status);
        // Read a short prefix for the server log only; it is never returned.
        const detail = (await response.text().catch(() => "")).slice(0, 300);
        console.warn(`[provider:${provider}] ${response.status} ${detail}`);
        lastError = new ProviderError(
          provider,
          `${provider} responded with ${response.status}`,
          response.status,
          retryable,
        );
        throw lastError;
      } else {
        // 204 and empty bodies are legitimate "no data" answers, not failures.
        if (response.status === 204) return null;
        const text = await response.text();
        if (text.trim().length === 0) return null;
        return JSON.parse(text) as unknown;
      }
    } catch (error) {
      if (error instanceof ProviderError) {
        lastError = error;
        // A 4xx will fail the same way every time; only retry transient faults.
        if (!error.retryable || attempt === retries) throw error;
      } else {
        const aborted = error instanceof Error && error.name === "AbortError";
        lastError = new ProviderError(
          provider,
          aborted ? `${provider} timed out` : `${provider} is unreachable`,
          null,
          true,
        );
        if (attempt === retries) throw lastError;
      }
    } finally {
      clearTimeout(timer);
    }
    await sleep(250 * (attempt + 1));
  }

  throw lastError;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Runs tasks with a hard concurrency cap so one request cannot fan out badly. */
export async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  task: (item: T, index: number) => Promise<R>,
): Promise<PromiseSettledResult<R>[]> {
  const results: PromiseSettledResult<R>[] = new Array(items.length);
  let cursor = 0;

  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor++;
      try {
        results[index] = { status: "fulfilled", value: await task(items[index], index) };
      } catch (reason) {
        results[index] = { status: "rejected", reason };
      }
    }
  });

  await Promise.all(workers);
  return results;
}
