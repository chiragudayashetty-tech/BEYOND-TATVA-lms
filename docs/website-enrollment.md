# Website → LMS enrollment

Payments happen on beyondtatva.in. After a payment is verified there, the website tells the LMS,
and the course unlocks on the student's LMS account that signs in with the same **email** or **parent phone**.

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
- `status: "pending"`: no account yet. It unlocks the moment they sign in with that email, or sign up giving that parent phone.
- Retrying the same `reference` is safe. Refunded payments never re-unlock.
- Two siblings sharing one parent phone and no email match: the enrollment waits; assign it in **Studio → Enrollments**.
- Every enrollment is listed in **Studio → Enrollments**, where you can also add UPI/cash payments by hand.

## Tell students on the website's success page

> Open **learn.beyondtatva.in** and sign in with **the same email** you used here. The full course is already unlocked.
