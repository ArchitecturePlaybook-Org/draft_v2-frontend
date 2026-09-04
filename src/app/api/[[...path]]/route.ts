import { NextRequest } from "next/server";
import { handleProxy } from "@/lib/api/handler";
import { ProxyContext } from "@/lib/api/types";
import { GET as handleProxyAsset } from "@/app/api/v1/proxy-asset/route";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

export async function GET(req: NextRequest, ctx: ProxyContext) {
  if (req.nextUrl.pathname.includes("/proxy-asset")) {
    return handleProxyAsset(req);
  }
  return handleProxy(req, ctx);
}

export async function POST(req: NextRequest, ctx: ProxyContext) {
  return handleProxy(req, ctx);
}

export async function PUT(req: NextRequest, ctx: ProxyContext) {
  return handleProxy(req, ctx);
}

export async function PATCH(req: NextRequest, ctx: ProxyContext) {
  return handleProxy(req, ctx);
}

export async function DELETE(req: NextRequest, ctx: ProxyContext) {
  return handleProxy(req, ctx);
}
