import { redirect } from "next/navigation";

/** Раньше был экран выбора; сразу форма подключения по invite. */
export default function AddTournamentPage() {
  redirect("/join");
}
