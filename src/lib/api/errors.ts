import { NextResponse } from "next/server";

export class ProxyError extends Error {
  constructor(public message: string, public status: number = 500) {
    super(message);
    this.name = "ProxyError";
  }
}

export function handleProxyError(err: unknown) {
  if (err instanceof ProxyError) {
    return NextResponse.json({ detail: err.message }, { status: err.status });
  }
  const errorMessage = err instanceof Error ? err.message : String(err);
  console.error("Proxy internal error:", errorMessage);
  return NextResponse.json({ detail: "Internal server error" }, { status: 500 });
}
