import { inspect } from "node:util";
import type { Response } from "express";

function messageOf(e: unknown): string {
  if (e instanceof Error) return e.message;
  if (typeof e === "object" && e !== null && "message" in e) {
    const m = (e as { message: unknown }).message;
    if (typeof m === "string") return m;
  }
  return typeof e === "string" ? e : "";
}

/** Deep string scan: esbuild-bundled Drizzle/pg may hide `cause` from a shallow walk; `inspect` exposes getters / nested fields. */
function errorTextForScan(err: unknown): string {
  try {
    if (typeof err === "object" && err !== null) {
      return inspect(err, { depth: 12, getters: true, breakLength: Infinity });
    }
  } catch {
    /* ignore */
  }
  return err instanceof Error ? `${err.message}\n${err.stack ?? ""}` : String(err);
}

/** Drizzle throws `DrizzleQueryError` with "Failed query: ..."; pg puts `code` / text on `cause` (not always `instanceof Error`). */
function isMissingRelationError(err: unknown): boolean {
  const blob = errorTextForScan(err);
  if (/42P01|relation .* does not exist|table .* does not exist/i.test(blob)) {
    return true;
  }

  const seen = new Set<unknown>();
  let current: unknown = err;

  for (let depth = 0; depth < 20 && current != null && !seen.has(current); depth++) {
    seen.add(current);

    const msg = messageOf(current);
    if (/relation .* does not exist/i.test(msg) || /table .* does not exist/i.test(msg)) {
      return true;
    }

    if (typeof current === "object" && current !== null && "code" in current) {
      const code = String((current as { code: unknown }).code);
      if (code === "42P01") return true;
    }

    let next: unknown;
    if (current instanceof Error && current.cause !== undefined) {
      next = current.cause;
    } else if (typeof current === "object" && current !== null) {
      const o = current as Record<string, unknown>;
      next = o["cause"] ?? o["originalError"] ?? o["error"];
    } else {
      next = undefined;
    }
    current = next;
  }

  // Last resort: Drizzle's top-level message is always `Failed query: <sql>...` and often omits
  // nested `cause` from logs/inspect in some runtimes. If the SQL references table `incidents`
  // (SELECT … from, INSERT into, UPDATE, etc.) and this does not look like connection/auth or
  // undefined_column, treat as schema not applied (same fix: db:push).
  const top = messageOf(err);
  if (top.startsWith("Failed query:") && /"incidents"/.test(top)) {
    const scan = errorTextForScan(err);
    if (
      /ECONNREFUSED|ETIMEDOUT|ENOTFOUND|getaddrinfo|password authentication failed|no pg_hba\.conf/i.test(
        scan,
      )
    ) {
      return false;
    }
    // Wrong/missing column — different fix than `db:push` on an empty DB.
    if (/42703|undefined column|column .* does not exist/i.test(scan)) {
      return false;
    }
    return true;
  }

  return false;
}

function isUndefinedColumnError(err: unknown): boolean {
  const blob = errorTextForScan(err);
  return /42703|undefined column|column .* does not exist/i.test(blob);
}

/** Send JSON when Drizzle/pg fails; 503 if tables were never created (drizzle-kit push). */
export function respondDbError(res: Response, err: unknown): void {
  if (res.headersSent) return;

  if (isMissingRelationError(err)) {
    res.status(503).json({
      error: "Database schema not applied",
      hint: "Start PostgreSQL, set DATABASE_URL, then run: pnpm run db:push (see docker-compose.yml).",
    });
    return;
  }

  if (isUndefinedColumnError(err)) {
    res.status(503).json({
      error: "Database schema out of date",
      hint: "Run from the repo: pnpm run db:push — your PostgreSQL is missing columns the API expects (e.g. after pulling new code).",
    });
    return;
  }

  const message =
    process.env.NODE_ENV === "development" && err instanceof Error
      ? [err.message, err.cause instanceof Error ? err.cause.message : "", errorTextForScan(err).slice(0, 2000)]
          .filter(Boolean)
          .join(" | ") || err.message
      : "Database error";

  res.status(500).json({ error: message });
}

export function catchAsync(
  handler: (req: Parameters<import("express").RequestHandler>[0], res: Response) => Promise<void>,
): import("express").RequestHandler {
  return (req, res, _next) => {
    void Promise.resolve(handler(req, res)).catch((err: unknown) => {
      try {
        respondDbError(res, err);
      } catch {
        /* avoid unhandledRejection if response already closed */
      }
    });
  };
}
