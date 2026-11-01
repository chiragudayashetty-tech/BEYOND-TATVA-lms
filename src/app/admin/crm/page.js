import { redirect } from "next/navigation";

// The CRM placeholder became Studio → Pipeline.
export default function CrmPage() {
  redirect("/admin/pipeline");
}
