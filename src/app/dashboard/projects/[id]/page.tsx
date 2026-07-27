import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ProjectDetailView } from "@/views/projects/ProjectDetailView";
import { COOKIE_REFRESH_TOKEN, COOKIE_ACCESS_TOKEN } from "@/lib/api/constants";

interface PageProps {
  params: Promise<{ id: string }>;
}

export const metadata = {
  title: "Project Detail Workspace - Architecture Playbook",
  description: "Detailed timeline, tasks, blueprints, data hub, and matrix overview for architectural projects.",
};

export default async function ProjectDetailPage({ params }: PageProps) {
  console.log("[ProjectDetailPage Server] Component mounted. Resolving params...");
  const { id } = await params;
  console.log("[ProjectDetailPage Server] Parameter 'id' resolved:", id);
  const cookieStore = await cookies();
  const sessionToken =
    cookieStore.get(COOKIE_ACCESS_TOKEN)?.value ||
    cookieStore.get(COOKIE_REFRESH_TOKEN)?.value;
  console.log('[ProjectDetailPage Server] sessionToken:', sessionToken);

  // Server-side Route Guard (Prevents layout flashing)
  if (!sessionToken) {
    console.warn('[ProjectDetailPage Server] No session token found, redirecting to /login');
    redirect('/login');
  }

  console.log("[ProjectDetailPage Server] Session validated, rendering ProjectDetailView for:", id);
  return <ProjectDetailView projectUid={id} />;
}
