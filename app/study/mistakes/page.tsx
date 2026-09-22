import { redirect } from "next/navigation";

export default async function LegacyMistakes({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const incoming = await searchParams;
  const params = new URLSearchParams({ tab: "mistakes" });
  for (const key of ["year", "session", "subject"]) {
    const value = incoming[key];
    if (typeof value === "string") params.set(key, value);
  }
  redirect(`/study/records?${params}`);
}
