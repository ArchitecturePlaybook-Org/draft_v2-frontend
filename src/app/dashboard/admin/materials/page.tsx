"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import MasterMaterialsPage from "@/app/dashboard/materials/page";

export default function AdminMaterialsRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/dashboard/materials");
  }, [router]);

  return <MasterMaterialsPage />;
}
