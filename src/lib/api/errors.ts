import { NextResponse } from "next/server";
import { captureFrontendError } from "@/lib/error-handler/centralErrorHandler";

export class ProxyError extends Error {
  constructor(public message: string, public status: number = 500) {
    super(message);
    this.name = "ProxyError";
  }
}

export function handleProxyError(err: unknown) {
  // Capture API Proxy error centrally
  captureFrontendError(err, { source: "api_proxy" });

  if (err instanceof ProxyError) {
    return NextResponse.json({ detail: err.message }, { status: err.status });
  }
  return NextResponse.json({ detail: "Internal server error" }, { status: 500 });
}

