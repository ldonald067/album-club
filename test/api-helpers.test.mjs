import test from "node:test";
import assert from "node:assert/strict";

// Imported from request-body.js, not api-helpers.js: the latter pulls in
// next/server, which does not resolve outside a Next build.
import { readJsonBody } from "../lib/request-body.js";

/** POST with a declared Content-Length, the way a normal client sends. */
function jsonRequest(text) {
  return new Request("http://localhost/api/test", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: text,
  });
}

/**
 * POST with a streamed body and no Content-Length — what `Transfer-Encoding:
 * chunked` looks like on the server. `pulled` counts chunks the server
 * actually asked for, which is how we tell "rejected early" from "buffered it
 * all and then complained".
 */
function chunkedRequest(chunks) {
  const counter = { pulled: 0 };
  let i = 0;
  const stream = new ReadableStream({
    pull(controller) {
      if (i >= chunks.length) {
        controller.close();
        return;
      }
      counter.pulled++;
      controller.enqueue(new TextEncoder().encode(chunks[i++]));
    },
  });
  const request = new Request("http://localhost/api/test", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: stream,
    duplex: "half",
  });
  return { request, counter };
}

test("reads a normal JSON object", async () => {
  const body = await readJsonBody(jsonRequest(JSON.stringify({ rating: 8 })));
  assert.deepEqual(body, { rating: 8 });
});

test("rejects a declared oversize body", async () => {
  const huge = JSON.stringify({ v: "x".repeat(5000) });
  await assert.rejects(
    () => readJsonBody(jsonRequest(huge), { maxChars: 64 }),
    {
      status: 413,
      code: "REQUEST_TOO_LARGE",
    },
  );
});

test("rejects an undeclared (chunked) oversize body", async () => {
  // 200 chunks of 1KB = ~200KB, no Content-Length to warn us in advance.
  const chunks = Array.from({ length: 200 }, () => "x".repeat(1024));
  const { request, counter } = chunkedRequest(chunks);

  await assert.rejects(() => readJsonBody(request, { maxChars: 1024 }), {
    status: 413,
    code: "REQUEST_TOO_LARGE",
  });

  // The point of the fix: stop mid-stream instead of buffering all 200KB.
  // The cap is 1024 chars * 4 bytes = 4096 bytes, so ~5 chunks of 1KB.
  assert.ok(
    counter.pulled < 10,
    `expected to abort within a few chunks, pulled ${counter.pulled} of ${chunks.length}`,
  );
});

test("accepts a chunked body that stays under the cap", async () => {
  const { request } = chunkedRequest(['{"vibe":', '"cozy"}']);
  assert.deepEqual(await readJsonBody(request), { vibe: "cozy" });
});

test("rejects malformed JSON", async () => {
  await assert.rejects(() => readJsonBody(jsonRequest("{not json")), {
    status: 400,
    code: "INVALID_JSON",
  });
});

test("rejects a non-object body when requireObject is set", async () => {
  await assert.rejects(() => readJsonBody(jsonRequest("[1,2,3]")), {
    status: 400,
    code: "INVALID_BODY",
  });
});
