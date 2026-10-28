import { redirect } from "next/navigation";

// Demo mode: send everyone to the profile picker. With auth this will route by role.
export default function Dashboard() {
  redirect("/profiles");
}
