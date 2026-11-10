// Shown only inside the Play Store app, in place of the price and pay button (see src/lib/android-app.js).
// Keep it to this: Google Play does not allow the app to say or link to where the course can be bought.
export default function AppNoPurchase({ className = "" }) {
  return (
    <div className={`app-only rounded-xl bg-surface-2 p-4 text-sm ${className}`}>
      <p className="font-semibold">You can&apos;t buy the course in this app.</p>
      <p className="mt-1 text-muted">Already have the course? Sign in with the same login you bought it with and it opens here. Have an access key? Enter it below.</p>
    </div>
  );
}
