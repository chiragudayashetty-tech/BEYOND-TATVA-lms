import Link from "next/link";

// A person's name anywhere in Studio: opens their student page, or their lead page if they have no account yet.
export default function PersonLink({ studentId, leadId, children, className = "" }) {
  const href = studentId ? `/admin/analytics/students/${studentId}` : leadId ? `/admin/pipeline/lead/${leadId}` : null;
  if (!href) return <span className={className}>{children}</span>;
  return <Link href={href} className={`${className} hover:text-primary hover:underline`}>{children}</Link>;
}
