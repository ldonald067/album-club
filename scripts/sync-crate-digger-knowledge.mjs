#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import OpenAI from "openai";

const ROOT = process.cwd();
const KNOWLEDGE_DIR = path.join(ROOT, "public", "agent-knowledge");
const VECTOR_STORE_NAME = "Album Club Crate Digger Knowledge";

function titleFromFilename(filename) {
  return filename
    .replace(/\.md$/i, "")
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

async function readKnowledgeFiles() {
  const entries = await fs.readdir(KNOWLEDGE_DIR, { withFileTypes: true });
  const files = entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".md"))
    .map((entry) => entry.name)
    .sort();

  if (files.length === 0) {
    throw new Error(`No markdown files found in ${KNOWLEDGE_DIR}`);
  }

  return Promise.all(
    files.map(async (filename) => ({
      filename,
      absolutePath: path.join(KNOWLEDGE_DIR, filename),
      title: titleFromFilename(filename),
      sourceUrl: `/agent-knowledge/${filename}`,
      content: await fs.readFile(path.join(KNOWLEDGE_DIR, filename)),
    })),
  );
}

async function resolveVectorStore(client) {
  const existingId = process.env.OPENAI_VECTOR_STORE_ID;
  if (existingId) {
    const vectorStore = await client.vectorStores.retrieve(existingId);
    return vectorStore;
  }

  return client.vectorStores.create({
    name: VECTOR_STORE_NAME,
    metadata: {
      app: "album-of-the-day-club",
      agent: "crate-digger",
      source: "public/agent-knowledge",
    },
  });
}

async function clearVectorStoreFiles(client, vectorStoreId) {
  const existingFiles = [];
  for await (const file of client.vectorStores.files.list(vectorStoreId)) {
    existingFiles.push(file);
  }

  for (const file of existingFiles) {
    await client.vectorStores.files.delete(file.id, {
      vector_store_id: vectorStoreId,
    });
  }

  return existingFiles.length;
}

async function uploadKnowledgeFile(client, vectorStoreId, file) {
  const upload = await OpenAI.toFile(file.content, file.filename, {
    type: "text/markdown",
  });
  const vectorFile = await client.vectorStores.files.uploadAndPoll(
    vectorStoreId,
    upload,
    { pollIntervalMs: 1000 },
  );

  await client.vectorStores.files.update(vectorFile.id, {
    vector_store_id: vectorStoreId,
    attributes: {
      title: file.title,
      source_url: file.sourceUrl,
      knowledge_pack: "crate-digger",
    },
  });

  return vectorFile;
}

async function main() {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("Missing OPENAI_API_KEY.");
  }

  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const knowledgeFiles = await readKnowledgeFiles();
  const vectorStore = await resolveVectorStore(client);
  const removedCount = await clearVectorStoreFiles(client, vectorStore.id);

  const uploaded = [];
  for (const file of knowledgeFiles) {
    const vectorFile = await uploadKnowledgeFile(client, vectorStore.id, file);
    uploaded.push({ filename: file.filename, id: vectorFile.id });
  }

  console.log(`Vector store: ${vectorStore.name || VECTOR_STORE_NAME}`);
  console.log(`OPENAI_VECTOR_STORE_ID=${vectorStore.id}`);
  console.log(`Removed ${removedCount} existing vector store file(s).`);
  console.log(`Uploaded ${uploaded.length} knowledge file(s):`);
  for (const file of uploaded) {
    console.log(`- ${file.filename} -> ${file.id}`);
  }
}

main().catch((error) => {
  console.error(error.message || error);
  process.exitCode = 1;
});
