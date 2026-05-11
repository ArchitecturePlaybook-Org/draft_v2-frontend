import { NextRequest } from "next/server";

export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export type CookieStrategy = "set-auth" | "clear-auth" | "none";

export interface ApiRouteConfig {
  prefix: string;
  target: string;
  methods: HttpMethod[];
  auth: boolean;
  cookieStrategy?: CookieStrategy;
}

export interface ResolvedRoute {
  config: ApiRouteConfig;
  targetUrl: string;
}

export interface ProxyContext {
  params: Promise<{ path?: string[] }>;
}
