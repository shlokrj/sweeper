import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);
  return worker.fetch(new Request("http://localhost/", { headers: { accept: "text/html" } }), { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } }, { waitUntil() {}, passThroughOnException() {} });
}

test("server-renders the light Minesweeper home page", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /Where logic meets chance\./);
  assert.match(html, /try the demo/);
  assert.match(html, /win rate/);
  assert.doesNotMatch(html, /local build|decision stack|Minesweeper research \/ 2026/i);
});

test("the demo and benchmark routes remain available", async () => {
  const [navigation, demo, benchmarks] = await Promise.all([
    readFile(new URL("../app/components/site-nav.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/demo/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/benchmarks/page.tsx", import.meta.url), "utf8"),
  ]);
  assert.match(navigation, /Home/);
  assert.match(navigation, /Benchmarks/);
  assert.match(demo, /setSelected/);
  assert.match(benchmarks, /90\.6%/);
});
