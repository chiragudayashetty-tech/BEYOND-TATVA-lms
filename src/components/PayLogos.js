// Payment method marks shown next to every Pay button (files in public/pay/).
const LOGOS = [["upi", "UPI", "w-10"], ["googlepay", "Google Pay"], ["phonepe", "PhonePe"], ["paytm", "Paytm"], ["visa", "Visa"], ["mastercard", "Mastercard"]];

export default function PayLogos({ className = "" }) {
  return (
    <div className={`flex flex-wrap items-center justify-center gap-1.5 ${className}`} aria-label="Pay with UPI, Google Pay, PhonePe, Paytm, Visa or Mastercard">
      {LOGOS.map(([f, alt, w]) => (
        // eslint-disable-next-line @next/next/no-img-element -- tiny static SVGs
        <span key={f} className="grid h-9 place-items-center rounded-lg border border-border bg-white px-2"><img src={`/pay/${f}.svg`} alt={alt} className={`h-5 ${w || "w-5"}`} /></span>
      ))}
    </div>
  );
}

// Razorpay window: UPI apps (Google Pay, PhonePe, Paytm…) first, then cards and the rest.
export const RAZORPAY_DISPLAY = {
  display: {
    blocks: { upi: { name: "Pay with UPI apps", instruments: [{ method: "upi" }] } },
    sequence: ["block.upi"],
    preferences: { show_default_blocks: true },
  },
};
