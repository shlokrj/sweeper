import assert from "node:assert/strict";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request("http://localhost/", {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
}

test("server-renders the Sweeper workspace", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>Sweeper \| Minesweeper research workspace<\/title>/i);
  assert.match(html, /Inspect the next move\./);
  assert.match(html, /Minesweeper board/);
  assert.match(html, /Recommended move/i);
  assert.doesNotMatch(html, /Codex is working|react-loading-skeleton/i);
});

test("analysis controls are present in the client page", async () => {
  const page = await import("node:fs/promises").then(({ readFile }) =>
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
  );

  assert.match(page, /^"use client";/);
  assert.match(page, /setSelectedCell/);
  assert.match(page, /setAgentMode/);
  assert.match(page, /strategy-aware CNN/);
});
