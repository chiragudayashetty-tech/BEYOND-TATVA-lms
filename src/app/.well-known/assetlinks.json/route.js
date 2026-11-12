import { assetLinks } from "@/lib/android-app";

// Read by Android when the Play Store app is installed (see src/lib/android-app.js).
export const dynamic = "force-dynamic"; // read the fingerprints on each request, not at build time

export function GET() {
  return Response.json(assetLinks(), { headers: { "cache-control": "public, max-age=3600" } });
}
