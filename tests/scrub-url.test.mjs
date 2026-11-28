import { test } from "node:test";
import assert from "node:assert/strict";
import { scrubEvent, scrubUrl } from "../src/lib/scrub-url.js";

test("phone, payment id and codes leave the URL; utm stays", () => {
  assert.equal(scrubUrl("https://learn.beyondtatva.in/pay?paid=9845012345&id=pay_ABC123&delayed=1&utm_source=qr"),
    "https://learn.beyondtatva.in/pay?paid=x&id=x&delayed=1&utm_source=qr");
  assert.equal(scrubUrl("/login?phone=9845012345&next=%2Fcourse"), "/login?phone=x&next=%2Fcourse");
  assert.equal(scrubUrl("https://learn.beyondtatva.in/course"), "https://learn.beyondtatva.in/course");
});

test("PostHog events are scrubbed in properties and $set", () => {
  const e = scrubEvent({ properties: { $current_url: "https://a.in/pay?paid=9845012345", $set: { $initial_current_url: "https://a.in/login?phone=9845012345" } } });
  assert.equal(e.properties.$current_url, "https://a.in/pay?paid=x");
  assert.equal(e.properties.$set.$initial_current_url, "https://a.in/login?phone=x");
});
