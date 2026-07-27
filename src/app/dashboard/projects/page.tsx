import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ProjectsRegistryView } from "@/views/projects/ProjectsRegistryView";
import { COOKIE_ACCESS_TOKEN } from "@/lib/api/constants";

export const metadata = {
  title: "Project Registry - Architecture Playbook",
  description: "Manage and oversee your firm's architectural blueprints, projects, and tasks.",
};

export default async function ProjectsPage() {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(COOKIE_ACCESS_TOKEN)?.value;

  console.log(sessionToken, 'zw')

  // Server-side Route Guard (Prevents layout flashing)
  // if (!sessionToken) {
  //   redirect("/login");
  // }

  return <ProjectsRegistryView />;
}
