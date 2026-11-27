import Logo from "@/components/Logo";
import AppNoPurchase from "@/components/AppNoPurchase";
import { getCourse } from "@/lib/data";
import GuestPay from "./GuestPay";
import { Lock } from "lucide-react";

export const metadata = { title: "Pay for the course · Beyond Tatva" };
export const dynamic = "force-dynamic"; // payment keys and price read on each request

// Public pay page: phone number → Razorpay → sign in with a WhatsApp code on that number → details → course.
export default async function PayPage({ searchParams }) {
  const sp = await searchParams;
  const paidPhone = /^[6-9]\d{9}$/.test(String(sp?.paid || "")) ? String(sp.paid) : "";
  const paidClaim = /^[a-f0-9]{32}$/.test(String(sp?.c || "")) ? String(sp.c) : "";
  const paidId = /^pay_[A-Za-z0-9]{6,30}$/.test(String(sp?.id || "")) ? String(sp.id) : "";
  const course = await getCourse();
  return (
    <main className="grid min-h-screen place-items-center bg-bg px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 flex justify-center"><Logo /></div>
        <section className="card p-6">
          <h1 className="flex items-center gap-2 text-xl font-semibold"><Lock className="h-5 w-5 text-success" /> Secure checkout</h1>
          <p className="web-only mt-1 text-sm text-muted">No account needed. Fill in the student&apos;s details after paying.</p>
          <AppNoPurchase className="mt-4" />
          <div className="web-only">
            <GuestPay
              title={course.title}
              price={course.price}
              enabled={Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET)}
              paidPhone={paidPhone}
              paidId={paidId}
              paidClaim={paidClaim}
              whatsapp={(process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP || "").replace(/\D/g, "")}
            />
          </div>
        </section>
      </div>
    </main>
  );
}
