import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { userNeedsEmailVerification } from "@/lib/email-verification";

export default async function LoginPage() {
  const session = await getSession();
  if (session) {
    redirect(
      userNeedsEmailVerification(session) ? "/verify-email" : "/",
    );
  }
  redirect("/");
}
