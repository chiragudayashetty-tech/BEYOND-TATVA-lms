import { test } from "node:test";
import assert from "node:assert/strict";
import { isOptOutError, aisensyBody, aisensyDestination, inSendWindow, runAutomations, sendAisensy } from "../src/lib/automations.js";

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
  assert.equal(calls[0][0], "automation_tick"); // due course messages are queued first
  assert.deepEqual(calls.filter((c) => c[0] === "automation_done").map((c) => c[1].p_ok), [true, false]);
  assert.deepEqual(await runAutomations(db, { now: new Date("2026-11-16T20:00:00Z") }), { waiting: true, sent: 0, failed: 0 });
});

test("AiSensy body carries contact tags, attributes and media", () => {
  const b = aisensyBody({ campaign: "A1_kn", phone: "+919845012345", name: "Lata", params: [], tags: ["SRVK", "Lead"], attributes: { grade: 9 }, media_url: "https://x.in/v/w.mp4?x=1" }, "k");
  assert.deepEqual(b.tags, ["SRVK", "Lead"]);
  assert.deepEqual(b.attributes, { grade: "9" });
  assert.deepEqual(b.media, { url: "https://x.in/v/w.mp4?x=1", filename: "w.mp4" });
});

test("AiSensy opt-out refusals are recognised and recorded, not counted as failed", async () => {
  assert.equal(isOptOutError("AiSensy 400: User has opted-out of API campaigns"), true);
  assert.equal(isOptOutError("AiSensy 406: Campaign is Not Live"), false);
  const calls = [];
  const db = { rpc: async (fn, a) => { calls.push(fn); return fn === "automation_claim" ? { data: [{ id: "x" }] } : { data: "ok" }; } };
  const r = await runAutomations(db, { force: true, send: async () => ({ ok: false, error: "Contact opted out" }) });
  assert.deepEqual(r, { sent: 0, failed: 0 });
  assert.deepEqual(calls, ["automation_tick", "automation_claim", "automation_opted_out"]);
});

test("each WhatsApp outcome becomes one analytics event, without the phone or name", async () => {
  const events = [];
  const msgs = [{ id: "a", rule_key: "welcome", campaign: "Welcome_kn", phone: "919845012345", name: "Lata" },
    { id: "b", rule_key: null, campaign: "A1_kn", phone: "919845012346" }, { id: "c", rule_key: "nudge", campaign: "Nudge" }];
  const db = { rpc: async (fn) => (fn === "automation_claim" ? { data: msgs } : { data: "ok" }) };
  const send = async (m) => (m.id === "a" ? { ok: true } : m.id === "b" ? { ok: false, error: "Campaign not live" } : { ok: false, error: "User opted out" });
  await runAutomations(db, { force: true, send, track: async (...a) => events.push(a) });
  assert.deepEqual(events.map((e) => [e[0], e[1], e[2].campaign]), [
    ["whatsapp_sent", "whatsapp:welcome", "Welcome_kn"], ["whatsapp_failed", "whatsapp:manual", "A1_kn"], ["whatsapp_opted_out", "whatsapp:nudge", "Nudge"]]);
  assert.ok(!JSON.stringify(events).includes("9198450") && !JSON.stringify(events).includes("Lata"));
  assert.equal(events[0][2].$process_person_profile, false);
});
