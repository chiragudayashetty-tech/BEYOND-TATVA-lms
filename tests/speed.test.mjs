import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const src = (p) => readFileSync(new URL(`../src/${p}`, import.meta.url), "utf8");

test("the per-page session never calls claim_purchases (it slowed every tap)", () => {
  assert.doesNotMatch(src("lib/supabase/server.js"), /claim_purchases/);
});

test("purchases are still claimed at sign-in, after onboarding and on /unlock", () => {
  assert.match(src("app/auth/callback/route.js"), /rpc\("claim_purchases"\)/);
  assert.match(src("app/onboarding/OnboardingForm.js"), /rpc\("claim_purchases"\)/);
  assert.match(src("app/unlock/page.js"), /rpc\("claim_purchases"\)/);
});

test("course content is cached and Studio saves refresh it", () => {
  const data = src("lib/data.js");
  assert.match(data, /unstable_cache\(/);
  assert.match(data, /tags: \[COURSE_TAG\]/);
  assert.match(src("app/admin/actions.js"), /updateTag\(COURSE_TAG\)/);
});

test("every page has an instant loading fallback", () => {
  assert.match(src("app/loading.js"), /export default function Loading/);
});

test("buttons and inputs are at least 44px tall, inputs 16px on phones (no iOS zoom)", () => {
  const css = src("app/globals.css");
  assert.match(css, /@utility btn \{\s*@apply[^;]*min-h-11/);
  assert.match(css, /@utility input \{\s*@apply[^;]*min-h-11[^;]*text-base[^;]*sm:text-sm/);
  assert.match(css, /touch-action: manipulation/);
});

test("every nav icon exists in NavLinks (no silent fallback circles)", async () => {
  const { nav } = await import("../src/lib/nav.js");
  const links = src("components/shell/NavLinks.js");
  for (const role of Object.values(nav)) for (const item of [...role.main, ...role.more, ...role.mobile]) {
    assert.match(links, new RegExp(`\\b${item.icon}\\b`), item.icon);
  }
});

test("reconciliation CSV neutralises spreadsheet formulas", () => {
  assert.match(src("app/admin/reconcile/reconcile-controls.js"), /\^\[=\+\\-@/);
});

test("progress and answers are written only through checked functions (M2)", () => {
  const view = src("app/watch/[id]/LessonView.js");
  assert.match(view, /rpc\("save_progress"/);
  assert.match(view, /rpc\("save_answer"/);
  assert.doesNotMatch(view, /from\("(lesson_progress|checkpoint_answers)"\)\.(upsert|insert|update)/);
});

test("quiz screen copes with hidden answers (M3)", () => {
  assert.match(src("app/quiz/[id]/QuizRunner.js"), /result\.revealed/);
});

test("Studio delete removes uploaded files with the server-only admin client", () => {
  const a = src("app/admin/actions.js");
  assert.match(a, /rpc\("admin_delete_student"/);
  assert.match(a, /storage\.from\("submissions"\)\.remove\(files\)/);
  assert.doesNotMatch(src("app/admin/people/PeopleForms.js"), /supabase\/admin/);
});

test("page skeletons share the app frame (padding, top bar, progress bar)", async () => {
  const { readdirSync, statSync } = await import("node:fs");
  const walk = (d) => readdirSync(d).flatMap((f) => { const p = `${d}/${f}`; return statSync(p).isDirectory() ? walk(p) : [p]; });
  const root = new URL("../src/app", import.meta.url).pathname;
  const loaders = walk(root).filter((p) => p.endsWith("/loading.js") );
  for (const f of loaders) assert.match(readFileSync(f, "utf8"), /LoadingState|LoadingFrame/, f);
});
