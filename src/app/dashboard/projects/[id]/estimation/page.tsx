import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { EstimationView } from "@/views/projects/EstimationView";
import { COOKIE_REFRESH_TOKEN } from "@/lib/api/constants";

interface PageProps {
  params: Promise<{ id: string }>;
}

export const metadata = {
  title: "2D Estimation Canvas Workspace - Architecture Playbook",
  description: "Calculate materials, takeoff quantities, line paths, and square footage measurements for project plans.",
};

export default async function EstimationPage({ params }: PageProps) {
  const { id } = await params;
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(COOKIE_REFRESH_TOKEN)?.value;

  // Server-side Route Guard (Prevents layout flashing)
  if (!sessionToken) {
    redirect("/login");
  }

  return <EstimationView projectUid={id} />;
}
