import { headers } from "next/headers";
import { jsonNoStore, jsonRateLimited } from "@/lib/api-helpers";
import { checkRateLimit, getRealIp } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const hdrs = await headers();
  const ip = getRealIp(hdrs);
  if (!checkRateLimit(ip)) {
    return jsonRateLimited();
  }

  return jsonNoStore({
    commit: (process.env.RAILWAY_GIT_COMMIT_SHA || "dev").slice(0, 7),
    volumeMounted: Boolean(process.env.RAILWAY_VOLUME_MOUNT_PATH),
    uptimeSeconds: Math.round(process.uptime()),
  });
}
