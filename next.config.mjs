/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // Every LMS page is dynamic (it reads the session), and Next.js keeps 0 s of dynamic pages in the
    // browser by default: each tap refetched from the server and flashed the loading skeleton, even when
    // going back to a page seen seconds ago. Keep visited pages for 30 s so switching tabs is instant.
    // Server actions that call revalidatePath/updateTag (and router.refresh) still clear this cache.
    staleTimes: { dynamic: 30 },
  },
};

export default nextConfig;
