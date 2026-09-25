/**
 * `server-only` resolves to its client build under Vitest, which throws on
 * import. Server modules are exercised directly in Node here, so it is aliased
 * to this no-op. The real guard still applies to the Next.js build.
 */
export {};
