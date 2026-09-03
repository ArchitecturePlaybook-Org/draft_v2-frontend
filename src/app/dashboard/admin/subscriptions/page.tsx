import { Metadata } from "next";
import { SubscriptionManagementView } from "@/views/admin/subscriptions/SubscriptionManagementView";

export const metadata: Metadata = {
  title: "Payments & Subscriptions - Super Admin | Architecture Playbook",
  description: "Monitor active paid users, payment history, total platform revenue, and manage firm subscriptions.",
};

export default function AdminSubscriptionsPage() {
  return (
    <div className="w-full max-w-full space-y-4">
      <SubscriptionManagementView />
    </div>
  );
}
