# Refund policy (DRAFT, needs Chirag's approval before publishing)

Status: draft 2026-11-14. Not shown anywhere yet. Once approved: publish it on the website
(`/refund-policy`, linked in the footer) and link it under the Pay button on LMS `/unlock`.
Razorpay also expects a public refund policy page on your website.

Decisions for Chirag (draft defaults in brackets):
1. Refund window: [7 days from payment]
2. Usage limit: [no more than 2 paid lessons watched]
3. School-paid and access-key enrollments: [refunds go through the school / whoever paid]
4. Refund time: [5–7 working days, back to the original payment method]

---

## Public text (for parents and students)

### Our refund promise

Module 0 is free, so you can try the course before you pay. If you pay and then feel it isn't right
for your child, you can get your money back.

**You get a full refund if:**
- you ask within **7 days** of paying, **and**
- the student has watched **no more than 2 paid lessons**.

**We can't refund:**
- requests made more than 7 days after payment
- accounts where more than 2 paid lessons have been watched
- accounts closed because the course rules were broken (for example, sharing your login or videos)

If something went wrong on our side (you were charged twice, or the course didn't work on your
device and we couldn't fix it), we refund in full, whatever the date.

### How to ask for a refund

Message us on WhatsApp at [support number] or email [support email] with:
- the student's name
- the email or phone number used to sign in
- the payment reference from your Razorpay receipt (starts with `pay_`)

We reply within 2 working days.

### What happens next

- The money goes back to the **same payment method** (UPI, card or net banking) within
  **5–7 working days** after we approve it. Your bank may take a few extra days to show it.
- Course access ends when the refund is made. Module 0 stays free.

### Paid by a school or with an access key

If your school paid, or you used an access key from us, please ask whoever paid. Refunds go back to
them.

---

## Internal steps (Chirag)

1. Check the request against the rules: payment date (Studio → Enrollments) and paid lessons
   watched (student page in Studio).
2. **Paid on `/unlock` (Razorpay):** Razorpay Dashboard → Payments → that `pay_…` → Refund → **Full**.
   Access ends automatically through the webhook (needs the `refund.processed` event switched on).
   Partial refunds keep access: also click "Refunded" in Studio only if access should end.
3. **Paid via WhatsApp / access key:** send the money back by UPI, then Studio → Enrollments →
   "Refunded" on that reference.
4. Reply to the parent with the refund reference and the 5–7 working day timeline.
5. Look at Studio → Insights → refunds every month. Each refund reason tells you what to improve.
