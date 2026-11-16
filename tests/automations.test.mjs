import { test } from "node:test";
import assert from "node:assert/strict";
import { aisensyBody, aisensyDestination, inSendWindow, runAutomations, sendAisensy } from "../src/lib/automations.js";

test("send window is 9:00–20:59 IST", () => {
  assert.equal(inSendWindow(new Date("2026-11-16T03:29:00Z")), false); // 08:59 IST
  assert.equal(inSendWindow(new Date("2026-11-16T03:30:00Z")), true);  // 09:00 IST
  assert.equal(inSendWindow(new Date("2026-11-16T15:29:00Z")), true);  // 20:59 IST
  assert.equal(inSendWindow(new Date("2026-11-16T15:30:00Z")), false); // 21:00 IST
});

test("AiSensy body", () => {
  assert.equal(aisensyDestination("+919845012345"), "919845012345");
  const b = aisensyBody({ campaign: "lms_welcome", phone: "+919845012345", name: "", params: ["Meena", 5] }, "k");
  assert.deepEqual(b, { apiKey: "k", campaignName: "lms_welcome", destination: "919845012345", userName: "Parent", templateParams: ["Meena", "5"], source: "lms", tags: [], attributes: {} });
});

test("send reports AiSensy errors and missing key", async () => {
  const msg = { campaign: "c", phone: "+919845012345", params: [] };
  assert.equal((await sendAisensy(msg, { apiKey: "" })).ok, false);
  const bad = async () => new Response(JSON.stringify({ message: "Campaign not live" }), { status: 400 });
  assert.match((await sendAisensy(msg, { apiKey: "k", fetchImpl: bad })).error, /Campaign not live/);
  const good = async () => new Response("{}", { status: 200 });
  assert.equal((await sendAisensy(msg, { apiKey: "k", fetchImpl: good })).ok, true);
});

test("run claims, sends and records each result", async () => {
  const calls = [];
  const db = { rpc: async (fn, args) => { calls.push([fn, args]); return fn === "automation_claim" ? { data: [{ id: "a" }, { id: "b" }] } : { data: "ok" }; } };
  const r = await runAutomations(db, { force: true, send: async (m) => ({ ok: m.id === "a", error: "x" }) });
  assert.deepEqual(r, { sent: 1, failed: 1 });
  assert.deepEqual(calls.slice(1).map((c) => c[1].p_ok), [true, false]);
  assert.deepEqual(await runAutomations(db, { now: new Date("2026-11-16T20:00:00Z") }), { waiting: true, sent: 0, failed: 0 });
});

test("AiSensy body carries contact tags, attributes and media", () => {
  const b = aisensyBody({ campaign: "A1_kn", phone: "+919845012345", name: "Lata", params: [], tags: ["SRVK", "Lead"], attributes: { grade: 9 }, media_url: "https://x.in/v/w.mp4?x=1" }, "k");
  assert.deepEqual(b.tags, ["SRVK", "Lead"]);
  assert.deepEqual(b.attributes, { grade: "9" });
  assert.deepEqual(b.media, { url: "https://x.in/v/w.mp4?x=1", filename: "w.mp4" });
});
