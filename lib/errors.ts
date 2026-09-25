export type AppErrorCode =
  | "bad_request"
  | "unauthorized"
  | "forbidden"
  | "not_found"
  | "conflict"
  | "unavailable"
  | "internal";

const STATUS: Record<AppErrorCode, number> = {
  bad_request: 400,
  unauthorized: 401,
  forbidden: 403,
  not_found: 404,
  conflict: 409,
  unavailable: 503,
  internal: 500,
};

/** Error carrying a message that is safe to show a user. */
export class AppError extends Error {
  readonly code: AppErrorCode;
  readonly status: number;
  readonly details: unknown;

  constructor(code: AppErrorCode, message: string, details?: unknown) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.status = STATUS[code];
    this.details = details;
  }
}

export const badRequest = (m: string, d?: unknown) => new AppError("bad_request", m, d);
export const unauthorized = (m = "You need to join this trip first.") =>
  new AppError("unauthorized", m);
export const forbidden = (m = "You do not have access to this trip.") =>
  new AppError("forbidden", m);
export const notFound = (m = "We could not find that.") => new AppError("not_found", m);
export const conflict = (m: string) => new AppError("conflict", m);
