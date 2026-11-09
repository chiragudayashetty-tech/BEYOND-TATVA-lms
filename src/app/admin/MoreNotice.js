// Shown when a Studio list hit its limit, so older records are never silently missing.
export default function MoreNotice({ shown, href, what }) {
  return (
    <p className="mb-4 rounded-xl bg-warning-soft p-3 text-sm text-warning">
      Showing the latest {shown} {what}. Older ones aren&apos;t listed. <a href={href} className="font-semibold underline">Show more</a>
    </p>
  );
}
