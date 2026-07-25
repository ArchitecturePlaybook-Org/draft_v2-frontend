import { NextRequest } from "next/server";
import { ResolvedRoute } from "./types";

export async function buildBackendRequest(req: NextRequest): Promise<RequestInit> {
  const headers = new Headers(req.headers);
  headers.delete("host"); 
  headers.delete("content-length"); 

  const method = req.method;
  let body: BodyInit | null | undefined = undefined;
  
  if (["POST", "PUT", "PATCH"].includes(method)) {
    const contentType = req.headers.get("content-type") || "";
    if (contentType.includes("multipart/form-data")) {
      // Re-create FormData entries with explicit Blob and filename
      // because raw NextRequest File objects lose stream references when passed directly to Node fetch
      const incomingFormData = await req.formData();
      const newFormData = new FormData();
      for (const [key, value] of incomingFormData.entries()) {
        if (value && typeof value === "object" && "arrayBuffer" in value) {
          const fileObj = value as File;
          const buffer = await fileObj.arrayBuffer();
          newFormData.append(key, new Blob([buffer], { type: fileObj.type }), fileObj.name || "file");
        } else {
          newFormData.append(key, value);
        }
      }
      body = newFormData;
      headers.delete("content-type"); // let fetch handle boundary
    } else {
      body = await req.text();
    }
  }

  return {
    method,
    headers,
    body,
    cache: "no-store",
    redirect: "manual",
  };
}
