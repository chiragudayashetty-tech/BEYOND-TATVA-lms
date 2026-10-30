import { redirect } from "next/navigation";

// Single-course LMS: the old course routes all point to the course page.
export default function Page() {
  redirect("/course");
}
