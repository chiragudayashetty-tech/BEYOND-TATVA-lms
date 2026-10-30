import Shell from "@/components/shell/Shell";
import { PageTitle } from "@/components/ui";
import SearchClient from "./SearchClient";

export const metadata = { title: "Search · Beyond Tatva" };

export default async function SearchPage({ searchParams }) {
  const { q = "" } = await searchParams;
  return (
    <Shell roles={["student", "teacher"]}>
      <PageTitle title="Search" />
      <SearchClient key={q} initial={q} />
    </Shell>
  );
}
