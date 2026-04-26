import { headers } from "next/headers";
import { getTodayAlbum } from "@/lib/albums";
import {
  getPublicRouteError,
  getSecondsUntilNextUtcDay,
  jsonNoStore,
  jsonRateLimited,
  readJsonBody,
} from "@/lib/api-helpers";
import { checkRateLimit, checkDailyLimit, getRealIp } from "@/lib/rate-limit";
import {
  createCrateDiggerResponse,
  getCrateDiggerRuntimeStatusWithHealthCheck,
} from "@/lib/crate-digger-agent";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BODY_CHARS = 4096;
const MAX_MESSAGES = 8;
const MAX_MESSAGE_CHARS = 700;
function normalizeMessages(rawMessages) {
  if (!Array.isArray(rawMessages)) return null;

  const allowedRoles = new Set(["user", "assistant"]);
  const normalized = [];

  for (const message of rawMessages.slice(-MAX_MESSAGES)) {
    if (!message || !allowedRoles.has(message.role)) continue;
    if (typeof message.content !== "string") continue;

    const content = message.content.trim().slice(0, MAX_MESSAGE_CHARS);
    if (!content) continue;

    normalized.push({
      role: message.role,
      content,
    });
  }

  return normalized;
}

function toPublicChatStatus(status) {
  return {
    available: status.available,
    provider: status.provider,
    model: status.model,
    enabledTools: status.enabledTools,
    reason: status.available ? "" : status.reason,
  };
}

export async function GET() {
  const status = toPublicChatStatus(
    await getCrateDiggerRuntimeStatusWithHealthCheck(),
  );

  return jsonNoStore(status, {
    status: status.available ? 200 : 503,
  });
}

export async function POST(request) {
  try {
    const runtimeStatus = await getCrateDiggerRuntimeStatusWithHealthCheck();

    if (!runtimeStatus.available) {
      return jsonNoStore(
        {
          error: runtimeStatus.reason,
          ...toPublicChatStatus(runtimeStatus),
        },
        {
          status: 503,
        },
      );
    }

    const hdrs = await headers();
    const ip = getRealIp(hdrs);

    if (!checkRateLimit(ip, 12, 60000)) {
      return jsonRateLimited();
    }

    if (!checkDailyLimit(ip, "chat", 25)) {
      return jsonRateLimited("Daily chat limit reached", {
        retryAfter: getSecondsUntilNextUtcDay(),
      });
    }

    const body = await readJsonBody(request, { maxChars: MAX_BODY_CHARS });

    const messages = normalizeMessages(body.messages);
    if (!messages || messages.length === 0) {
      return jsonNoStore({ error: "Messages are required" }, { status: 400 });
    }

    const hasUserMessage = messages.some((message) => message.role === "user");
    if (!hasUserMessage) {
      return jsonNoStore(
        { error: "A user message is required" },
        { status: 400 },
      );
    }

    const data = await createCrateDiggerResponse({
      apiKey: process.env.OPENAI_API_KEY,
      album: getTodayAlbum(),
      messages,
      provider: runtimeStatus.provider,
      model: runtimeStatus.model,
      vectorStoreId: process.env.OPENAI_VECTOR_STORE_ID,
    });

    if (!data.reply) {
      return jsonNoStore(
        { error: "The chat agent did not send a reply." },
        { status: 502 },
      );
    }

    return jsonNoStore(data);
  } catch (error) {
    const publicError = getPublicRouteError(
      error,
      "Failed to reach the chat agent",
    );
    if (publicError.status >= 500) {
      console.error("POST /api/chat error:", error);
    }

    return jsonNoStore(
      { error: publicError.message },
      { status: publicError.status },
    );
  }
}
