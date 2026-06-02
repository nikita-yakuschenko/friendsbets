import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { userNeedsEmailVerification } from "@/lib/email-verification";

export default async function RegisterPage() {
  const session = await getSession();
  if (session) {
    redirect(
      userNeedsEmailVerification(session) ? "/verify-email" : "/",
    );
  }

  redirect("/?register=1");
}
