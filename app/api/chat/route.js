import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { getTodayAlbum } from "@/lib/albums";
import { checkRateLimit, checkDailyLimit, getRealIp } from "@/lib/rate-limit";
import {
  createCrateDiggerResponse,
  getCrateDiggerModel,
  getCrateDiggerProvider,
} from "@/lib/crate-digger-agent";

export const runtime = "nodejs";

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

export async function POST(request) {
  try {
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

    let body;
    try {
      const text = await request.text();
      if (text.length > MAX_BODY_CHARS) {
        return NextResponse.json(
          { error: "Request too large" },
          { status: 413 },
        );
      }
      body = JSON.parse(text);
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

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

    const provider = getCrateDiggerProvider();
    const data = await createCrateDiggerResponse({
      apiKey: process.env.OPENAI_API_KEY,
      album: getTodayAlbum(),
      messages,
      provider,
      model: getCrateDiggerModel(provider),
      vectorStoreId: process.env.OPENAI_VECTOR_STORE_ID,
    });

    if (!data.reply) {
      return NextResponse.json(
        { error: "The chat agent did not send a reply." },
        { status: 502 },
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("POST /api/chat error:", error);
    if (
      typeof error?.code === "string" &&
      /^(OLLAMA|OPENAI)_/.test(error.code)
    ) {
      return NextResponse.json(
        { error: error.message || "Failed to reach the chat agent" },
        { status: error.status || 503 },
      );
    }

    if (error?.status) {
      return NextResponse.json(
        { error: "The chat agent hit static. Try again in a minute." },
        { status: 502 },
      );
    }

    return NextResponse.json(
      { error: "Failed to reach the chat agent" },
      { status: 500 },
    );
  }
}
