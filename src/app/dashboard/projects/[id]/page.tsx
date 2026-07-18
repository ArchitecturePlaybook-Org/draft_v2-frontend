import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ProjectDetailView } from "@/views/projects/ProjectDetailView";
import { COOKIE_REFRESH_TOKEN } from "@/lib/api/constants";

interface PageProps {
  params: Promise<{ id: string }>;
}

export const metadata = {
  title: "Project Detail Workspace - Architecture Playbook",
  description: "Detailed timeline, tasks, blueprints, data hub, and matrix overview for architectural projects.",
};

export default async function ProjectDetailPage({ params }: PageProps) {
  const { id } = await params;
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(COOKIE_REFRESH_TOKEN)?.value;

  // Server-side Route Guard (Prevents layout flashing)
  if (!sessionToken) {
    redirect("/login");
  }

  return <ProjectDetailView projectUid={id} />;
}
