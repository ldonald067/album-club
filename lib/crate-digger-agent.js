import fs from "node:fs/promises";
import path from "node:path";
import OpenAI from "openai";

export const DEFAULT_CRATE_DIGGER_MODEL = "gemma3:4b";
export const DEFAULT_CRATE_DIGGER_PROVIDER = "ollama";

const DEFAULT_OPENAI_MODEL = "gpt-5.4-mini";
const DEFAULT_OLLAMA_HOST = "http://127.0.0.1:11434";
const MAX_REPLY_CHARS = 1800;
const MAX_FILE_RESULTS = 4;
const MAX_LOCAL_KNOWLEDGE_RESULTS = 4;
const KNOWLEDGE_DIR = path.join(process.cwd(), "public", "agent-knowledge");
const ALWAYS_INCLUDED_KNOWLEDGE_FILES = new Set([
  "site-voice.md",
  "source-policy.md",
  "conversation-style.md",
  "safety-and-limits.md",
]);
const SAFETY_CITATION_URL = "/agent-knowledge/safety-and-limits.md";
const STOP_WORDS = new Set([
  "about",
  "after",
  "again",
  "album",
  "also",
  "and",
  "are",
  "artist",
  "best",
  "but",
  "for",
  "from",
  "game",
  "have",
  "into",
  "just",
  "like",
  "more",
  "music",
  "not",
  "that",
  "the",
  "their",
  "them",
  "this",
  "today",
  "what",
  "with",
  "would",
  "your",
]);
const KNOWLEDGE_INTENT_BOOSTS = [
  {
    filename: "soundtrack-taxonomy.md",
    patterns: [
      /\b(?:soundtrack|ost|menu|boss|overworld|battle|credits|safe room|racing|jrpg|rpg|platformer|horror|cozy)\b/i,
    ],
  },
  {
    filename: "scene-and-era-bridges.md",
    patterns: [
      /\b(?:scene|era|movement|revival|blog era|college radio|mixtape|internet|subgenre|underground|mainstream|trend)\b/i,
    ],
  },
  {
    filename: "artist-context-lenses.md",
    patterns: [
      /\b(?:artist|career|discography|producer|label|collaborator|feature|credits|influence|context)\b/i,
    ],
  },
  {
    filename: "recommendation-bridge-playbook.md",
    patterns: [
      /\b(?:recommend|similar|like this|what next|where do i start|starter|entry point|deep cut|accessible)\b/i,
    ],
  },
  {
    filename: "forum-debate-moves.md",
    patterns: [
      /\b(?:opinion|hot take|overrated|underrated|defend|argue|debate|unpopular|wrong about)\b/i,
    ],
  },
];

let warnedNoVectorStore = false;
let knowledgePackPromise = null;

const HATE_ALLOWLIST_PATTERNS = [
  /\bwhy is (?:racism|sexism|misogyny|homophobia|transphobia|antisemitism|bigotry|ableism)\b/i,
  /\bhow (?:do|should) i\b[\s\S]{0,80}\b(?:respond to|handle|deal with|report|call out)\b[\s\S]{0,120}\b(?:racist|sexist|misogynistic|homophobic|transphobic|antisemitic|bigoted|hateful)\b/i,
  /\b(?:analyze|explain|rewrite|moderate|report|discuss|study|summarize)\b[\s\S]{0,120}\b(?:racist|sexist|misogynistic|homophobic|transphobic|antisemitic|bigoted|hateful|hate speech)\b/i,
  /\b(?:someone|my boss|my coworker|my family|a guy|a girl)\b[\s\S]{0,120}\b(?:said|posted|wrote|sent)\b[\s\S]{0,120}\b(?:racist|sexist|misogynistic|homophobic|transphobic|antisemitic|bigoted|hateful)\b/i,
];

const HATE_REQUEST_PATTERNS = [
  /\b(?:write|make|generate|create|give|tell|draft|send|come up with)\b[\s\S]{0,120}\b(?:racist|sexist|misogynistic|homophobic|transphobic|antisemitic|bigoted|hateful)\b[\s\S]{0,120}\b(?:joke|insult|slur|post|tweet|message|rant|meme|comment)\b/i,
  /\b(?:write|make|generate|create|give|tell|draft|send|come up with)\b[\s\S]{0,120}\b(?:joke|insult|slur|post|tweet|message|rant|meme|comment)\b[\s\S]{0,120}\b(?:about|for|targeting)\b[\s\S]{0,80}\b(?:women|men|girls|boys|black people|white people|asian people|latino people|jews|muslims|immigrants|gay people|lesbians|trans people|disabled people)\b/i,
  /\b(?:why are|prove that|show that|explain why)\b[\s\S]{0,80}\b(?:women|men|girls|boys|black people|white people|asian people|latino people|jews|muslims|immigrants|gay people|lesbians|trans people|disabled people)\b[\s\S]{0,80}\b(?:inferior|stupid|lazy|criminal|dirty|gross|subhuman|worthless|less intelligent)\b/i,
  /\b(?:slur|insult|degrade|mock|harass|bully|humiliate|attack)\b[\s\S]{0,120}\b(?:women|men|girls|boys|black people|white people|asian people|latino people|jews|muslims|immigrants|gay people|lesbians|trans people|disabled people)\b/i,
  /\b(?:i hate|i'm racist|i am racist|women are inferior|men are inferior|trans people are inferior|gay people are inferior|immigrants are inferior)\b/i,
];

function makeAgentError(message, status, code) {
  const error = new Error(message);
  error.status = status;
  error.code = code;
  return error;
}

function normalizeProvider(value) {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toLowerCase();
  if (normalized === "ollama" || normalized === "openai") return normalized;
  return null;
}

export function getCrateDiggerProvider() {
  return (
    normalizeProvider(process.env.CRATE_DIGGER_PROVIDER) ||
    normalizeProvider(process.env.AI_PROVIDER) ||
    DEFAULT_CRATE_DIGGER_PROVIDER
  );
}

export function getCrateDiggerModel(provider) {
  if (provider === "openai") {
    return process.env.OPENAI_MODEL || DEFAULT_OPENAI_MODEL;
  }

  return process.env.OLLAMA_MODEL || DEFAULT_CRATE_DIGGER_MODEL;
}

export function buildCrateDiggerInstructions(album) {
  return [
    "You are Crate Digger, the Album Of The Day Club chat agent.",
    "You are a daily companion for music nerds, pop-culture lurkers, and video game soundtrack people.",
    "Your lane: music history, album context, taste comparisons, recommendations, pop culture references, video games, fan communities, and soundtrack culture.",
    `Today's album is "${album.title}" by ${album.artist} (${album.year}, ${album.genre}).`,
    "You are not a human being. Do not imply you have a body, ears, memories, a private life, or firsthand experience.",
    "If a user asks what you personally listened to, felt, remembered, played, or lived through, answer honestly that you are a model going off patterns, context, and available sources.",
    "Answer the user's actual question first. Tie back to today's album only when it helps.",
    "Sound like a real person in a good forum thread, not a customer-support article.",
    "Be warm, opinionated, concise, and specific. No gatekeeping. No fake certainty.",
    "Use contractions and natural rhythm. It is fine to be a little dry, playful, or lightly snarky when it feels earned.",
    "The snark should punch up at trends, cliches, or overhyped ideas, not at the user.",
    "Have taste. It is okay to say something is clunky, too polished, trying too hard, or kind of corny if you explain why.",
    "When the user is chatting rather than fact-checking, react like a person first, then answer, then keep the thread alive with one short follow-up only when natural.",
    "Keep most replies under 140 words unless the user asks for depth.",
    "Default to one or two short paragraphs, not a wall of text.",
    "Avoid lists unless the user asks for a list.",
    "Avoid repetitive openers like 'let's dig in' or 'absolutely.' Vary your cadence.",
    "Use model knowledge for taste, mood, recommendations, and broad context.",
    "Do not pretend to know everything. If you are unsure, say so plainly and say what you would want to verify.",
    "When talking about scenes or eras, anchor claims to the album's actual year and context. Do not slap later internet-era labels onto older records unless you clearly say you are describing later reception.",
    "Do not help create, endorse, or justify racist, sexist, homophobic, transphobic, antisemitic, ableist, or other hateful content. Set a brief boundary and redirect.",
    "Do not quote long lyrics, reviews, articles, or copyrighted passages. Summarize in your own words.",
  ].join("\n");
}

function getLatestUserMessage(messages) {
  return (
    [...messages].reverse().find((message) => message.role === "user")?.content ||
    ""
  );
}

function buildLocalModeHints(album, messages) {
  const latestUserMessage = getLatestUserMessage(messages).toLowerCase();
  const hints = [];

  if (/\b(?:scene|era|movement|context)\b/.test(latestUserMessage)) {
    hints.push(
      `Historical anchor: this album came out in ${album.year}. Do not mention blog era, internet scenes, or online music communities unless that actually fits the year and context.`,
    );
  }

  if (/\b(?:producer|credits|label|sample)\b/.test(latestUserMessage)) {
    hints.push(
      "For credits, labels, producers, and samples, be careful: if you are not sure, say you would verify rather than guessing.",
    );
  }

  return hints;
}

function repairHistoricalOverreach({ album, messages, response }) {
  const latestUserMessage = getLatestUserMessage(messages).toLowerCase();

  if (
    album.year < 1990 &&
    /\b(?:scene|era|movement|context)\b/.test(latestUserMessage) &&
    /\b(?:blog[- ]era|internet scenes?|online music communities?)\b/i.test(
      response.reply,
    )
  ) {
    return {
      ...response,
      reply: `I don't want to fake the scene history here. The safer read is that "${album.title}" belongs to its ${album.year} context around ${album.artist} and the broader ${album.genre.toLowerCase()} world, but I would verify the exact scene or label framing before getting more specific.`,
    };
  }

  return response;
}

function buildGuardrailResponse({ provider, vectorStoreId, reply }) {
  const tools =
    provider === "openai"
      ? buildCrateDiggerTools({ provider, vectorStoreId })
      : [];

  return {
    reply,
    citations: [
      {
        type: "file",
        title: "Safety And Limits",
        url: SAFETY_CITATION_URL,
      },
    ],
    usedTools: { web: false, files: true },
    enabledTools: getEnabledToolLabels({ provider, tools }),
    provider,
  };
}

function getGuardrailResponse({ messages, provider, vectorStoreId }) {
  const latestUserMessage = getLatestUserMessage(messages).trim();
  if (!latestUserMessage) return null;

  if (HATE_ALLOWLIST_PATTERNS.some((pattern) => pattern.test(latestUserMessage))) {
    return null;
  }

  if (HATE_REQUEST_PATTERNS.some((pattern) => pattern.test(latestUserMessage))) {
    return buildGuardrailResponse({
      provider,
      vectorStoreId,
      reply:
        "I'm not going to help with racist, sexist, or other hateful stuff. If you're trying to make a point without punching down, I can help rewrite it, or help you respond to prejudice without amplifying it.",
    });
  }

  return null;
}

async function loadKnowledgePack() {
  if (!knowledgePackPromise) {
    knowledgePackPromise = (async () => {
      const entries = await fs.readdir(KNOWLEDGE_DIR, { withFileTypes: true });
      const files = entries
        .filter((entry) => entry.isFile() && entry.name.endsWith(".md"))
        .map((entry) => entry.name)
        .sort();

      const docs = await Promise.all(
        files.map(async (filename) => {
          const fullPath = path.join(KNOWLEDGE_DIR, filename);
          const text = await fs.readFile(fullPath, "utf8");
          const heading = text.match(/^#\s+(.+)$/m);
          const title = heading
            ? heading[1].trim()
            : filename.replace(/\.md$/i, "");
          return {
            filename,
            title,
            url: `/agent-knowledge/${filename}`,
            text,
            haystack: `${filename}\n${title}\n${text}`.toLowerCase(),
          };
        }),
      );

      return docs;
    })().catch((error) => {
      knowledgePackPromise = null;
      throw error;
    });
  }

  return knowledgePackPromise;
}

function tokenize(text) {
  return [
    ...new Set(
      String(text)
        .toLowerCase()
        .match(/[a-z0-9]+/g)
        ?.filter((token) => token.length > 2 && !STOP_WORDS.has(token)) || [],
    ),
  ];
}

function getKnowledgeIntentBoost(doc, query) {
  const boost = KNOWLEDGE_INTENT_BOOSTS.find(
    (entry) => entry.filename === doc.filename,
  );
  if (!boost) return 0;

  return boost.patterns.reduce(
    (sum, pattern) => sum + (pattern.test(query) ? 3 : 0),
    0,
  );
}

function selectRelevantKnowledgeDocs(docs, messages, album) {
  const latestUserMessage =
    [...messages].reverse().find((message) => message.role === "user")
      ?.content || "";
  const query = `${latestUserMessage} ${album.title} ${album.artist} ${album.genre}`;
  const tokens = tokenize(query);
  const lowerQuery = query.toLowerCase();

  const scored = docs
    .map((doc) => ({
      doc,
      score:
        tokens.reduce(
          (sum, token) => sum + (doc.haystack.includes(token) ? 1 : 0),
          0,
        ) + getKnowledgeIntentBoost(doc, lowerQuery),
    }))
    .sort(
      (a, b) => b.score - a.score || a.doc.title.localeCompare(b.doc.title),
    );

  const selected = scored
    .filter((item) => item.score > 0)
    .slice(0, MAX_LOCAL_KNOWLEDGE_RESULTS)
    .map((item) => item.doc);

  if (selected.length > 0) return selected;

  return docs.slice(0, MAX_LOCAL_KNOWLEDGE_RESULTS);
}

function selectPromptKnowledgeDocs(docs, messages, album) {
  const alwaysIncluded = docs.filter((doc) =>
    ALWAYS_INCLUDED_KNOWLEDGE_FILES.has(doc.filename),
  );
  const topicalDocs = selectRelevantKnowledgeDocs(
    docs.filter((doc) => !ALWAYS_INCLUDED_KNOWLEDGE_FILES.has(doc.filename)),
    messages,
    album,
  );

  return [
    ...new Map(
      [...alwaysIncluded, ...topicalDocs].map((doc) => [doc.filename, doc]),
    ).values(),
  ];
}

function buildKnowledgeContext(docs) {
  return docs.map((doc) => `## ${doc.title}\n${doc.text.trim()}`).join("\n\n");
}

export function buildCrateDiggerTools({ provider, vectorStoreId } = {}) {
  if (provider !== "openai") {
    return [];
  }

  const tools = [
    {
      type: "web_search",
      search_context_size: "medium",
      user_location: {
        type: "approximate",
        country: "US",
        timezone: "America/Denver",
      },
    },
  ];

  if (vectorStoreId) {
    tools.unshift({
      type: "file_search",
      vector_store_ids: [vectorStoreId],
      max_num_results: MAX_FILE_RESULTS,
    });
  } else if (!warnedNoVectorStore) {
    warnedNoVectorStore = true;
    console.info(
      "Crate Digger file search disabled: OPENAI_VECTOR_STORE_ID is not set.",
    );
  }

  return tools;
}

export function getEnabledToolLabels({ provider, tools }) {
  if (provider === "openai") {
    return {
      web: tools.some((tool) => tool.type === "web_search"),
      files: tools.some((tool) => tool.type === "file_search"),
    };
  }

  return { web: false, files: true };
}

function safeCitationUrl(url) {
  if (typeof url !== "string") return null;
  if (url.startsWith("https://") || url.startsWith("http://")) return url;
  if (url.startsWith("/agent-knowledge/")) return url;
  return null;
}

function titleFromUrl(url) {
  try {
    const parsed = new URL(url, "https://littlealbumclub.net");
    return parsed.hostname || parsed.pathname;
  } catch {
    return "Source";
  }
}

function addCitation(citations, seen, citation) {
  const url = safeCitationUrl(citation.url);
  const title =
    typeof citation.title === "string" && citation.title.trim()
      ? citation.title.trim()
      : url
        ? titleFromUrl(url)
        : "Source";
  const type = citation.type === "file" ? "file" : "web";
  const key = `${type}:${url || citation.fileId || title}`;

  if (seen.has(key)) return;
  seen.add(key);

  citations.push({
    type,
    title,
    url,
    fileId: typeof citation.fileId === "string" ? citation.fileId : undefined,
  });
}

function extractOpenAIOutputParts(response) {
  const textParts = [];
  const citations = [];
  const seen = new Set();
  const usedTools = { web: false, files: false };

  for (const item of response.output || []) {
    if (item?.type === "web_search_call") {
      usedTools.web = true;
      const sources = item.action?.sources || [];
      for (const source of sources) {
        addCitation(citations, seen, {
          type: "web",
          url: source.url,
        });
      }
    }

    if (item?.type === "file_search_call") {
      usedTools.files = true;
      for (const result of item.results || []) {
        addCitation(citations, seen, {
          type: "file",
          title: result.attributes?.title || result.filename,
          url: result.attributes?.source_url,
          fileId: result.file_id,
        });
      }
    }

    if (item?.type !== "message" || !Array.isArray(item.content)) continue;

    for (const content of item.content) {
      if (content?.type === "output_text" && typeof content.text === "string") {
        textParts.push(content.text);

        for (const annotation of content.annotations || []) {
          if (annotation.type === "url_citation") {
            addCitation(citations, seen, {
              type: "web",
              title: annotation.title,
              url: annotation.url,
            });
          }
          if (annotation.type === "file_citation") {
            addCitation(citations, seen, {
              type: "file",
              title: annotation.filename,
              url: `/agent-knowledge/${annotation.filename}`,
              fileId: annotation.file_id,
            });
          }
        }
      }

      if (content?.type === "refusal" && typeof content.refusal === "string") {
        textParts.push(content.refusal);
      }
    }
  }

  const reply =
    typeof response.output_text === "string" && response.output_text.trim()
      ? response.output_text.trim()
      : textParts.join("\n").trim();

  return {
    reply: reply.slice(0, MAX_REPLY_CHARS),
    citations,
    usedTools,
  };
}

async function createOpenAICrateDiggerResponse({
  apiKey,
  album,
  messages,
  model,
  vectorStoreId,
}) {
  if (!apiKey) {
    throw makeAgentError(
      "OpenAI mode is enabled, but OPENAI_API_KEY is missing.",
      503,
      "OPENAI_MISSING_KEY",
    );
  }

  const client = new OpenAI({ apiKey, timeout: 20000 });
  const tools = buildCrateDiggerTools({
    provider: "openai",
    vectorStoreId,
  });

  const response = await client.responses.create({
    model,
    instructions: buildCrateDiggerInstructions(album),
    input: messages.map((message) => ({
      role: message.role,
      content: message.content,
    })),
    tools,
    tool_choice: "auto",
    include: ["web_search_call.action.sources", "file_search_call.results"],
    max_output_tokens: 600,
    store: false,
  });

  return {
    ...extractOpenAIOutputParts(response),
    enabledTools: getEnabledToolLabels({ provider: "openai", tools }),
    provider: "openai",
  };
}

async function createOllamaCrateDiggerResponse({ album, messages, model }) {
  const knowledgeDocs = await loadKnowledgePack();
  const promptDocs = selectPromptKnowledgeDocs(knowledgeDocs, messages, album);
  const localModeHints = buildLocalModeHints(album, messages);
  const ollamaHost = (process.env.OLLAMA_HOST || DEFAULT_OLLAMA_HOST).replace(
    /\/$/,
    "",
  );

  const response = await fetch(`${ollamaHost}/api/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      stream: false,
      messages: [
        {
          role: "system",
          content: [
            buildCrateDiggerInstructions(album),
            "You are in local free mode. There is no live web search in this mode.",
            "If you are unsure about a factual claim, say that you would verify it instead of guessing.",
            ...localModeHints,
            "Use the Album Club knowledge pack below for voice, conversation style, listening language, recommendation patterns, and game/pop-culture bridges.",
            buildKnowledgeContext(promptDocs),
          ].join("\n\n"),
        },
        ...messages,
      ],
      options: {
        temperature: 0.9,
        top_p: 0.95,
        repeat_penalty: 1.08,
      },
    }),
    signal: AbortSignal.timeout(30000),
  });

  let data = null;
  try {
    data = await response.json();
  } catch {}

  if (!response.ok) {
    const message = data?.error || "The local model failed to respond.";

    if (response.status === 404) {
      throw makeAgentError(
        `Crate Digger is set to use Ollama, but the model "${model}" is not available yet. Install Ollama, then run: ollama pull ${model}`,
        503,
        "OLLAMA_MODEL_MISSING",
      );
    }

    throw makeAgentError(message, 502, "OLLAMA_ERROR");
  }

  const reply =
    typeof data?.message?.content === "string"
      ? data.message.content.trim().slice(0, MAX_REPLY_CHARS)
      : "";

  if (!reply) {
    throw makeAgentError(
      "The local model did not send a reply.",
      502,
      "OLLAMA_EMPTY_REPLY",
    );
  }

  return repairHistoricalOverreach({
    album,
    messages,
    response: {
    reply,
    citations: promptDocs.map((doc) => ({
      type: "file",
      title: doc.title,
      url: doc.url,
    })),
    usedTools: { web: false, files: true },
    enabledTools: getEnabledToolLabels({ provider: "ollama", tools: [] }),
    provider: "ollama",
    },
  });
}

export async function createCrateDiggerResponse({
  apiKey,
  album,
  messages,
  provider = getCrateDiggerProvider(),
  model = getCrateDiggerModel(provider),
  vectorStoreId,
}) {
  const guardrailResponse = getGuardrailResponse({
    messages,
    provider,
    vectorStoreId,
  });
  if (guardrailResponse) {
    return guardrailResponse;
  }

  if (provider === "openai") {
    return createOpenAICrateDiggerResponse({
      apiKey,
      album,
      messages,
      model,
      vectorStoreId,
    });
  }

  try {
    return await createOllamaCrateDiggerResponse({
      album,
      messages,
      model,
    });
  } catch (error) {
    if (error?.name === "TimeoutError" || error?.name === "AbortError") {
      throw makeAgentError(
        "Crate Digger could not reach the local model in time. Make sure Ollama is running and try again.",
        503,
        "OLLAMA_TIMEOUT",
      );
    }

    if (
      error?.cause?.code === "ECONNREFUSED" ||
      error?.code === "ECONNREFUSED"
    ) {
      throw makeAgentError(
        `Crate Digger is set to use the free local Ollama mode, but nothing is listening at ${process.env.OLLAMA_HOST || DEFAULT_OLLAMA_HOST}. Install Ollama, then run: ollama pull ${model}`,
        503,
        "OLLAMA_UNAVAILABLE",
      );
    }

    throw error;
  }
}
