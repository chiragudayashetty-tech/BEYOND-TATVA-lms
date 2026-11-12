import { test } from "node:test";
import assert from "node:assert/strict";
import { buildCourse, nextStep, stepLink } from "../src/lib/catalog.js";

const NOW = new Date("2026-11-10T12:00:00Z").getTime();
const course = { id: "c", title: "C", price_inr: 499 };
const chapters = [
  { id: "m0", position: 0, title: "Intro", is_free: true, release_at: "2026-10-01T00:00:00Z" },
  { id: "m1", position: 1, title: "Study", is_free: false, release_at: "2026-11-01T00:00:00Z" },
  { id: "m2", position: 2, title: "Create", is_free: false, release_at: "2026-11-15T04:30:00Z" },
];
const lessons = [
  { id: "a", chapter_id: "m0", position: 1, title: "A", minutes: 10 },
  { id: "b", chapter_id: "m0", position: 2, title: "B", minutes: 10 },
  { id: "c", chapter_id: "m1", position: 3, title: "C", minutes: 10 },
];
const quiz = { id: "q0", chapter_id: "m0", title: "Quiz 0" };
const build = (done = [], rows = []) => buildCourse(course, chapters, lessons, new Set(done), rows);
const step = (c, access, acts) => nextStep(c, access, acts, NOW);

test("a new student starts with the first lesson", () => {
  const s = step(build(), false);
  assert.equal(s.kind, "lesson"); assert.equal(s.lesson.id, "a"); assert.equal(s.started, false);
  assert.equal(stepLink("c", s).label, "Start Module 0");
});

test("a half-watched lesson comes first", () => {
  const s = step(build(["a"], [{ lesson_id: "b", seconds_watched: 120, updated_at: "2026-11-09T00:00:00Z" }]), false);
  assert.equal(s.kind, "resume"); assert.equal(s.lesson.id, "b");
  assert.equal(stepLink("c", s).href, "/watch/c?l=2");
});

test("after the videos comes the quiz, then the next module or unlock", () => {
  const c = build(["a", "b"]);
  const acts = { quizzes: [quiz], best: {} };
  assert.equal(step(c, false, acts).kind, "quiz");
  assert.equal(stepLink("c", step(c, false, acts)).href, "/quiz/q0");
  const passed = { quizzes: [quiz], best: { q0: { passed: true } } };
  assert.equal(step(c, false, passed).kind, "unlock");
  const paid = step(c, true, passed);
  assert.equal(paid.kind, "lesson"); assert.equal(paid.lesson.id, "c");
});

test("an assignment that was sent back counts as to do", () => {
  const acts = { quizzes: [], assignments: [{ id: "as", chapter_id: "m0", title: "Work" }], submissions: { as: { status: "returned" } } };
  assert.equal(step(build(["a", "b"]), false, acts).kind, "assignment");
  acts.submissions.as.status = "submitted";
  assert.equal(step(build(["a", "b"]), false, acts).kind, "unlock");
});

test("a paid student who is caught up waits for the next module", () => {
  const s = step(build(["a", "b", "c"]), true);
  assert.equal(s.kind, "wait"); assert.equal(s.module.id, "m2");
});

test("everything watched and nothing left means done", () => {
  const all = buildCourse(course, chapters.slice(0, 2), lessons, new Set(["a", "b", "c"]));
  assert.equal(step(all, true).kind, "done");
});

test("a failed quiz is offered again only while a try is left", () => {
  const c = build(["a", "b"]);
  assert.equal(step(c, false, { quizzes: [quiz], best: { q0: { passed: false, tries: 1 } } }).kind, "quiz");
  assert.equal(step(c, false, { quizzes: [quiz], best: { q0: { passed: false, tries: 2 } } }).kind, "unlock");
});
