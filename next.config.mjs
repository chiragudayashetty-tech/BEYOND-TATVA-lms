// Sent with every response. These stop other sites from putting the LMS inside a hidden frame
// (clickjacking: a child could be tricked into tapping "Pay" or "Delete"), stop browsers guessing file
// types, and keep full page addresses from leaking to other sites. No script rules here on purpose:
// Razorpay, YouTube and Bunny load their own scripts, and a wrong rule would break paying or watching.
const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'; base-uri 'self'; object-src 'none'" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  experimental: {
    // Every LMS page is dynamic (it reads the session), and Next.js keeps 0 s of dynamic pages in the
    // browser by default: each tap refetched from the server and flashed the loading skeleton, even when
    // going back to a page seen seconds ago. Keep visited pages for 30 s so switching tabs is instant.
    // Server actions that call revalidatePath/updateTag (and router.refresh) still clear this cache.
    staleTimes: { dynamic: 30 },
  },
};

export default nextConfig;
