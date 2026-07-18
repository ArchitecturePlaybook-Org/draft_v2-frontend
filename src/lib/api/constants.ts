export const DJANGO_API_URL = process.env.DJANGO_API_URL || "http://127.0.0.1:8000";
export const COOKIE_ACCESS_TOKEN = "access_token";
export const COOKIE_REFRESH_TOKEN = "refresh_token";
export const COOKIE_USER_ROLE = "user_role";

export const ACCESS_TOKEN_MAX_AGE = 60 * 60 * 24; // 1 day
export const REFRESH_TOKEN_MAX_AGE = 60 * 60 * 24 * 7; // 7 days
export const REMEMBER_ME_MAX_AGE = 60 * 60 * 24 * 90; // 90 days

export function getWebSocketUrl(path: string = ""): string {
  let wsHost = process.env.NEXT_PUBLIC_WS_URL;
  if (!wsHost) {
    if (typeof window !== "undefined") {
      const apiHost = process.env.NEXT_PUBLIC_API_URL || window.location.origin;
      try {
        const url = new URL(apiHost);
        const wsProtocol = url.protocol === "https:" ? "wss:" : "ws:";
        wsHost = `${wsProtocol}//${url.host}`;
      } catch {
        const wsProtocol = window.location.protocol === "https:" ? "wss:" : "ws:";
        wsHost = `${wsProtocol}//${window.location.host}`;
      }
    } else {
      const apiHost = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
      try {
        const url = new URL(apiHost);
        const wsProtocol = url.protocol === "https:" ? "wss:" : "ws:";
        wsHost = `${wsProtocol}//${url.host}`;
      } catch {
        wsHost = "ws://127.0.0.1:8000";
      }
    }
  }

  const cleanedHost = wsHost.endsWith("/") ? wsHost.slice(0, -1) : wsHost;
  const cleanedPath = path.startsWith("/") ? path : `/${path}`;
  return `${cleanedHost}${cleanedPath}`;
}
