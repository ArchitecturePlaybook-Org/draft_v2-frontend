"use client";

import React, { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import { MasterFieldDiary } from "@/components/projects/MasterFieldDiary";

export default function FieldDiaryPage() {
  const params = useParams();
  const projectId = params.id as string;

  return <MasterFieldDiary projectId={projectId} />;
}
