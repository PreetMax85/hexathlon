/** Small helpers shared by the route handlers. */

export class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly extra?: Record<string, unknown>,
  ) {
    super(message);
  }
}

export function json(data: unknown, status = 200): Response {
  return Response.json(data, { status, headers: { "cache-control": "no-store" } });
}

export const MAX_BODY_BYTES = 16 * 1024;

/** Read a JSON body, refusing anything over `maxBytes`. */
export async function readJson(req: Request, maxBytes = MAX_BODY_BYTES): Promise<unknown> {
  const declared = Number(req.headers.get("content-length") ?? 0);
  if (declared > maxBytes) throw new HttpError(413, "request body too large");
  const text = await req.text();
  if (text.length > maxBytes) throw new HttpError(413, "request body too large");
  try {
    return JSON.parse(text);
  } catch {
    throw new HttpError(400, "body must be valid JSON");
  }
}

/** Wrap a handler so thrown HttpErrors and unexpected errors become JSON responses. */
export function handle<Args extends unknown[]>(
  fn: (...args: Args) => Promise<Response>,
): (...args: Args) => Promise<Response> {
  return async (...args) => {
    try {
      return await fn(...args);
    } catch (err) {
      if (err instanceof HttpError) return json({ error: err.message, ...err.extra }, err.status);
      const missingDb = err instanceof Error && err.message.includes("DATABASE_URL");
      console.error("api error", err instanceof Error ? err.message : err);
      return json(
        { error: missingDb ? "database not configured" : "internal error" },
        missingDb ? 503 : 500,
      );
    }
  };
}
