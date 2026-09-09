import { redirect } from "next/navigation";

export default function MistakesPage() {
  redirect("/study/records?tab=mistakes");
}
