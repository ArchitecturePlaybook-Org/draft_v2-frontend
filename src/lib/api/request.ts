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
      // We must buffer the form data if we want to be able to retry the request (e.g. on 401 refresh)
      // because the raw req.body stream can only be consumed once.
      const formData = await req.formData();
      body = formData;
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
