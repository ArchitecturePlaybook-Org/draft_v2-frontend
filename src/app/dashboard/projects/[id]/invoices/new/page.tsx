"use client";

import React from "react";
import { useParams } from "next/navigation";
import { InvoiceEditorForm } from "@/components/invoices/InvoiceEditorForm";

export default function CreateInvoicePage() {
  const params = useParams();
  const projectUid = params.id as string;

  return <InvoiceEditorForm mode="create" projectUid={projectUid} />;
}
