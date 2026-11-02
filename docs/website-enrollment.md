# Website → LMS enrollment

Payments happen on beyondtatva.in. After a payment is verified there, the website tells the LMS,
and the course unlocks on the LMS account that signs in with the same **verified email** (Google) or **phone login**.
A match on the parent phone typed at sign-up only creates a suggestion that Chirag approves in Studio (audit H2).

## 1. Set the shared secret (both Vercel projects)

| Project | Variable | Value |
|---|---|---|
| `beyond-tatva-web-lptp` (website) | `ENROLLMENT_WEBHOOK_SECRET` | same long random string |
| `beyond-tatva-web-lptp` (website) | `LMS_URL` | `https://<lms-domain>` |
| `beyond-tatva-lms` (LMS) | `ENROLLMENT_WEBHOOK_SECRET` | same long random string |
| `beyond-tatva-lms` (LMS) | `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Project Settings → API keys |

Generate the secret once: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`

## 2. Add this to the website

Create `api/_lms.js` in the website repo:

```js
const crypto = require("crypto");

// Tells the LMS about a paid (or refunded) enrollment. Never throws: payment success must not depend on it.
async function notifyLms(payload) {
  try {
    const body = JSON.stringify(payload);
    const ts = Math.floor(Date.now() / 1000).toString();
    const sig = crypto.createHmac("sha256", process.env.ENROLLMENT_WEBHOOK_SECRET).update(`${ts}.${body}`).digest("hex");
    const res = await fetch(`${process.env.LMS_URL}/api/enrollments`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-bt-timestamp": ts, "x-bt-signature": sig },
      body,
    });
    if (!res.ok) console.error("LMS enrollment failed", res.status, await res.text());
    return res.ok;
  } catch (e) {
    console.error("LMS enrollment error", e);
    return false;
  }
}

module.exports = { notifyLms };
```

Then in `api/verify-payment.js`, **after** the Razorpay signature is verified and before responding:

```js
const { notifyLms } = require("./_lms");

await notifyLms({
  event: "enrollment.paid",
  reference: razorpay_payment_id,            // the Razorpay payment id
  email: studentEmail,                        // the email the student will sign in with (Gmail is best)
  phone: parentPhone,                         // 10-digit Indian mobile, any format
  student_name: studentName,
  parent_name: parentName,
  amount_paise: amountPaid,                   // e.g. 94905
});
```

For a refund (Razorpay webhook `refund.processed`, full refund):

```js
await notifyLms({ event: "enrollment.refunded", reference: payment_id });
```

## 3. What happens

- `status: "claimed"`: a student account already matched, so it's unlocked now.
- `status: "pending"`: no verified match yet. It unlocks the moment someone signs in with that email/phone; a parent-phone match waits for Studio approval.
- Retrying the same `reference` is safe. Refunded payments never re-unlock.
- Parent-phone-only or sibling matches wait in **Studio → Enrollments** (Approve / Give to student).
- Every enrollment is listed in **Studio → Enrollments**, where you can also add UPI/cash payments by hand.

## Tell students on the website's success page

> Open **learn.beyondtatva.in** and sign in with **the same Google account or phone number** you used here. The course can be opened only with that login.

## Leads: website → LMS (`POST /api/leads`)

Same secret, same signing and same `api/_lms.js` helper idea as enrollments. The website's Loki chat and
forms send each lead (keep the Google Sheet as a backup). The LMS matches a lead to a student by the
**parent phone** the student gives at sign-up, and shows everyone in Studio → Pipeline.

```json
{ "reference": "loki-<random uuid made once per lead>", "phone": "9845012345", "source": "loki",
  "parent_name": "...", "student_name": "...", "grade": 9, "school_name": "...",
  "details": { "board": "CBSE", "goal": "...", "lang": "kn", "utm_source": "qr", "utm_campaign": "..." } }
```
- Required: `reference`, `phone` (Indian mobile), `source` (lowercase letters, digits, `-`, `_`).
- `details`: at most 15 flat keys (`a-z_`), string values up to 200 characters. Anything else is dropped.
- Response `{ ok: true, status: "saved" | "duplicate" }`. 400 = bad data (don't retry), 401 = bad signature, 500 = retry later.
- The website endpoint that browsers call must validate the fields itself and never expose the secret.

## Where a sign-in came from

Link to the LMS as `<lms>/login?src=loki&utm_source=qr&utm_campaign=<event>`. The tags are saved on the
student's profile once, when they finish onboarding, and shown in Studio → Pipeline.
