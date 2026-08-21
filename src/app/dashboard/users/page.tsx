import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { UserManagementView } from "@/views/users/UserManagementView";
import { COOKIE_REFRESH_TOKEN, COOKIE_ACCESS_TOKEN } from "@/lib/api/constants";

export const metadata = {
  title: "User Directory - Architecture Playbook",
  description: "Manage platform users and review activity audit logs.",
};

export default async function UserManagementPage() {
  const cookieStore = await cookies();
  const sessionToken =
    cookieStore.get(COOKIE_ACCESS_TOKEN)?.value ||
    cookieStore.get(COOKIE_REFRESH_TOKEN)?.value;

  if (!sessionToken) {
    redirect("/login");
  }

  return <UserManagementView />;
}
