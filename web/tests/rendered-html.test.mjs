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
  assert.match(html, /Where logic<\/span><span>meets chance\./);
  assert.match(html, /play a board/);
  assert.match(html, /win rate/);
  assert.doesNotMatch(html, /local build|decision stack|Minesweeper research \/ 2026/i);
});

test("the navigation, playable demo, and benchmark routes remain available", async () => {
  const [brandMark, navigation, engine, home, styles, demo, benchmarks] = await Promise.all([
    readFile(new URL("../app/components/brand-mark.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/components/site-nav.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/components/minesweeper.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
    readFile(new URL("../app/demo/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/benchmarks/page.tsx", import.meta.url), "utf8"),
  ]);
  assert.match(brandMark, /Sweeper home/);
  assert.match(brandMark, /className="brand"/);
  assert.match(brandMark, /href="\/"/);
  assert.match(brandMark, /brand-word/);
  assert.match(brandMark, /blastPixels/);
  assert.match(brandMark, /document\.body\.append\(burst\)/);
  assert.match(brandMark, /onClick=\{explode\}/);
  assert.match(navigation, /Home/);
  assert.match(navigation, /Demo/);
  assert.match(navigation, /Benchmarks/);
  assert.match(navigation, /made by shlok\.fyi/);
  assert.match(navigation, /className="smile-mark">:\)<\/span>/);
  assert.doesNotMatch(navigation, /href="\/play"/);
  assert.match(engine, /safeZone/);
  assert.match(engine, /easy: \{[^}]*columns: 9/);
  assert.match(engine, /medium: \{[^}]*columns: 18/);
  assert.match(engine, /hard: \{[^}]*columns: 24/);
  assert.match(engine, /mines: 99/);
  assert.match(engine, /breakMax/);
  assert.match(engine, /openingSize/);
  assert.match(home, /<span>Where logic<\/span><span>meets chance\.<\/span>/);
  assert.doesNotMatch(home, /made by shlok\.fyi/);
  assert.match(styles, /\.hero-board-shell \{ position: absolute; top: 50%; right: 0; width: min\(100%, 46vw, 720px\);/);
  assert.match(styles, /@keyframes pixel-smile/);
  assert.match(styles, /\.nav-credit \{ justify-self: end;/);
  assert.match(styles, /@media \(max-width: 850px\)/);
  assert.match(demo, /manual/);
  assert.match(demo, /useState<PlayMode>\("assisted"\)/);
  assert.match(demo, /\["manual", "assisted", "auto"\]/);
  assert.match(demo, /Auto play speed/);
  assert.match(demo, /PRESETS\[presetId\]/);
  assert.match(demo, /board-lock/);
  assert.match(demo, /run auto/);
  assert.match(demo, /MineMark/);
  assert.match(engine, /chordCell/);
  assert.match(engine, /provenSafe/);
  assert.match(demo, /revealCell|handleReveal/);
  assert.match(demo, /onContextMenu/);
  assert.match(demo, /play-explosion/);
  assert.match(demo, /board cleared/);
  assert.match(demo, /mine hit/);
  assert.match(demo, /is-scanline/);
  assert.match(demo, /play this move/);
  assert.match(benchmarks, /90\.6%/);
  assert.match(benchmarks, /seeds from 20000 through 20499/);
});
