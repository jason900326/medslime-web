import { redirect } from "next/navigation";

export default async function LegacyMistakeAttempt({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/study/records/attempt/${encodeURIComponent(id)}`);
}
