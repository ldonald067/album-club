import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { getTodayAlbum } from "@/lib/albums";
import { getPublicRouteError, readJsonBody } from "@/lib/api-helpers";
import { checkRateLimit, checkDailyLimit, getRealIp } from "@/lib/rate-limit";
import {
  createCrateDiggerResponse,
  getCrateDiggerRuntimeStatus,
} from "@/lib/crate-digger-agent";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BODY_CHARS = 4096;
const MAX_MESSAGES = 8;
const MAX_MESSAGE_CHARS = 700;
const NO_STORE_HEADERS = { "Cache-Control": "no-store" };

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
  const status = toPublicChatStatus(getCrateDiggerRuntimeStatus());

  return NextResponse.json(status, {
    status: status.available ? 200 : 503,
    headers: NO_STORE_HEADERS,
  });
}

export async function POST(request) {
  try {
    const runtimeStatus = getCrateDiggerRuntimeStatus();

    if (!runtimeStatus.available) {
      return NextResponse.json(
        {
          error: runtimeStatus.reason,
          ...toPublicChatStatus(runtimeStatus),
        },
        {
          status: 503,
          headers: NO_STORE_HEADERS,
        },
      );
    }

    const hdrs = await headers();
    const ip = getRealIp(hdrs);

    if (!checkRateLimit(ip, 12, 60000)) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    if (!checkDailyLimit(ip, "chat", 25)) {
      return NextResponse.json(
        { error: "Daily chat limit reached" },
        { status: 429 },
      );
    }

    const body = await readJsonBody(request, { maxChars: MAX_BODY_CHARS });

    const messages = normalizeMessages(body.messages);
    if (!messages || messages.length === 0) {
      return NextResponse.json(
        { error: "Messages are required" },
        { status: 400 },
      );
    }

    const hasUserMessage = messages.some((message) => message.role === "user");
    if (!hasUserMessage) {
      return NextResponse.json(
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
      return NextResponse.json(
        { error: "The chat agent did not send a reply." },
        { status: 502 },
      );
    }

    return NextResponse.json(data, {
      headers: NO_STORE_HEADERS,
    });
  } catch (error) {
    const publicError = getPublicRouteError(
      error,
      "Failed to reach the chat agent",
    );
    if (publicError.status >= 500) {
      console.error("POST /api/chat error:", error);
    }

    return NextResponse.json(
      { error: publicError.message },
      { status: publicError.status, headers: NO_STORE_HEADERS },
    );
  }
}
