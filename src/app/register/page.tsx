import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";

export default async function RegisterPage() {
  const session = await getSession();
  if (session) redirect("/");

  redirect("/?register=1");
}
