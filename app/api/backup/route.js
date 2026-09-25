import { headers } from "next/headers";
import fs from "fs";
import os from "os";
import path from "path";
import crypto from "crypto";
import { backupDatabase } from "@/lib/db";
import { jsonNoStore, jsonRateLimited } from "@/lib/api-helpers";
import { checkRateLimit, getRealIp } from "@/lib/rate-limit";
import { tokenMatches } from "@/lib/token-match";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/backup — streams a consistent SQLite snapshot for off-volume backup.
// Inert (404) unless BACKUP_TOKEN is configured. Auth via `Authorization:
// Bearer <token>` only. Data is anonymous aggregate vote counts (no PII), but
// the token still gates access.
//
// There used to be a `?token=` fallback. Nothing used it — the backup workflow
// sends the header — and a token in a URL lands in Railway's request logs, any
// proxy's logs and browser history, so it was a leak path with no caller.
export async function GET() {
  const token = process.env.BACKUP_TOKEN;
  // Feature off / not configured — behave as if the route doesn't exist.
  if (!token) {
    return jsonNoStore({ error: "Not found" }, { status: 404 });
  }

  const hdrs = await headers();
  const ip = getRealIp(hdrs);
  if (!checkRateLimit(ip, 6, 60000)) {
    return jsonRateLimited();
  }

  const authHeader = hdrs.get("authorization") || "";
  const bearer = authHeader.startsWith("Bearer ")
    ? authHeader.slice(7).trim()
    : "";
  if (!tokenMatches(bearer, token)) {
    // Don't confirm the route exists to an unauthorized caller.
    return jsonNoStore({ error: "Not found" }, { status: 404 });
  }

  const tmpPath = path.join(
    os.tmpdir(),
    `aotd-backup-${crypto.randomBytes(6).toString("hex")}.db`,
  );
  try {
    await backupDatabase(tmpPath);
    const buf = await fs.promises.readFile(tmpPath);
    const stamp = new Date().toISOString().slice(0, 10);
    return new Response(buf, {
      status: 200,
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Disposition": `attachment; filename="aotd-${stamp}.db"`,
        "Content-Length": String(buf.length),
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("GET /api/backup error:", error);
    return jsonNoStore({ error: "Backup failed" }, { status: 500 });
  } finally {
    fs.promises.unlink(tmpPath).catch(() => {});
  }
}
