import { NextRequest } from "next/server";
import { ResolvedRoute, HttpMethod } from "./types";
import { ProxyError } from "./errors";

export function validateMethod(req: NextRequest, route: ResolvedRoute) {
  const method = req.method as HttpMethod;
  if (!route.config.methods.includes(method)) {
    throw new ProxyError(`Method ${method} not allowed for this route`, 405);
  }
}
