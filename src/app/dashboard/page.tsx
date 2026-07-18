import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { DashboardView } from "@/views/dashboard/DashboardView";
import { COOKIE_REFRESH_TOKEN } from "@/lib/api/constants";

export const metadata = {
  title: "Architect Command Center - Architecture Playbook",
  description: "View dynamic rollup charts, team velocity stats, calendar schedules, and incoming client leads.",
};

export default async function DashboardPage() {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(COOKIE_REFRESH_TOKEN)?.value;

  // Server-side Route Guard (Prevents layout flashing)
  if (!sessionToken) {
    redirect("/login");
  }

  return <DashboardView />;
}
