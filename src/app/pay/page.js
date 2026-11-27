import Logo from "@/components/Logo";
import AppNoPurchase from "@/components/AppNoPurchase";
import { getCourse } from "@/lib/data";
import GuestPay from "./GuestPay";

export const metadata = { title: "Pay for the course · Beyond Tatva" };

// Public pay page: phone number → Razorpay → sign in with a WhatsApp code on that number → details → course.
export default async function PayPage() {
  const course = await getCourse();
  return (
    <main className="grid min-h-screen place-items-center bg-bg px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 flex justify-center"><Logo /></div>
        <section className="card p-6">
          <h1 className="text-xl font-semibold">{course.title}</h1>
          <p className="web-only mt-1 text-sm text-muted">Pay first, no account needed. After paying, confirm your number with a WhatsApp code, fill in a few details and the course opens.</p>
          <AppNoPurchase className="mt-4" />
          <div className="web-only">
            <GuestPay
              price={course.price}
              listPrice={course.listPrice}
              enabled={Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET)}
              whatsapp={(process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP || "").replace(/\D/g, "")}
            />
          </div>
        </section>
      </div>
    </main>
  );
}
