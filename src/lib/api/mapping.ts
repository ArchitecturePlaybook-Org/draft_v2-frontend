import { ApiRouteConfig } from "./types";

export const API_ROUTES: ApiRouteConfig[] = [
  {
    prefix: "v1/auth/login/2fa",
    target: "/api/v1/users/auth/login/2fa/",
    methods: ["POST"],
    auth: false,
    cookieStrategy: "set-auth",
  },
  {
    prefix: "v1/auth/login",
    target: "/api/v1/users/auth/login/",
    methods: ["POST"],
    auth: false,
    cookieStrategy: "set-auth",
  },
  {
    prefix: "v1/auth/2fa/setup",
    target: "/api/v1/users/auth/2fa/setup/",
    methods: ["POST"],
    auth: true,
  },
  {
    prefix: "v1/auth/2fa/confirm",
    target: "/api/v1/users/auth/2fa/confirm/",
    methods: ["POST"],
    auth: true,
  },
  {
    prefix: "v1/auth/2fa/disable",
    target: "/api/v1/users/auth/2fa/disable/",
    methods: ["POST"],
    auth: true,
  },
  {
    prefix: "v1/auth/register",
    target: "/api/v1/users/auth/register/",
    methods: ["POST"],
    auth: false,
    cookieStrategy: "set-auth",
  },
  {
    prefix: "v1/auth/refresh",
    target: "/api/v1/users/auth/token/refresh/",
    methods: ["POST"],
    auth: false,
    cookieStrategy: "set-auth",
  },
  {
    prefix: "v1/auth/verify-email",
    target: "/api/v1/users/auth/verify-email/",
    methods: ["POST"],
    auth: false,
  },
  {
    prefix: "v1/auth/resend-verification",
    target: "/api/v1/users/auth/resend-verification/",
    methods: ["POST"],
    auth: false,
  },
  {
    prefix: "v1/auth/password-reset/confirm",
    target: "/api/v1/users/auth/password-reset/confirm/",
    methods: ["POST"],
    auth: false,
  },
  {
    prefix: "v1/auth/password-reset",
    target: "/api/v1/users/auth/password-reset/",
    methods: ["POST"],
    auth: false,
  },
  {
    prefix: "v1/auth/social/google",
    target: "/api/v1/users/auth/social/google/",
    methods: ["POST"],
    auth: false,
    cookieStrategy: "set-auth",
  },
  {
    prefix: "v1/auth/social/apple",
    target: "/api/v1/users/auth/social/apple/",
    methods: ["POST"],
    auth: false,
    cookieStrategy: "set-auth",
  },
  {
    prefix: "v1/auth/logout",
    target: "/api/v1/users/auth/logout/",
    methods: ["POST"],
    auth: false,
    cookieStrategy: "clear-auth",
  },

  {
    prefix: "v1/auth/me",
    target: "/api/v1/users/profile/",
    methods: ["GET"],
    auth: true,
  },
  {
    prefix: "v1/auth/export-data",
    target: "/api/v1/users/profile/export/",
    methods: ["GET"],
    auth: true,
  },
  {
    prefix: "v1/auth/decommission",
    target: "/api/v1/users/profile/decommission/",
    methods: ["POST"],
    auth: true,
    cookieStrategy: "clear-auth",
  },
  {
    prefix: "v1/auth/profile",
    target: "/api/v1/users/profile/",
    methods: ["GET", "PATCH"],
    auth: true,
  },
  {
    prefix: "v1/orgs",
    target: "/api/v1/accounts/",
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    auth: true,
  },
  {
    prefix: "v1/projects/assets/presigned-upload-url",
    target: "/api/v1/projects/assets/presigned-upload-url/",
    methods: ["POST"],
    auth: true,
  },
  {
    prefix: "v1/projects/assets",
    target: "/api/v1/projects/assets/",
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    auth: false,
  },
  {
    prefix: "v1/projects/field-diaries",
    target: "/api/v1/projects/field-diaries/",
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    auth: false,
  },
  {
    prefix: "v1/projects/task-asset-links",
    target: "/api/v1/projects/task-asset-links/",
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    auth: true,
  },
  {
    prefix: "v1/projects",
    target: "/api/v1/projects/",
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    auth: true,
  },
  // Templates Hub (public browsing — no auth required)
  {
    prefix: "v1/marketplace/templates",
    target: "/api/v1/projects/marketplace/templates/",
    methods: ["GET"],
    auth: false,
  },
  {
    prefix: "v1/public/templates",
    target: "/api/v1/projects/public/templates/",
    methods: ["GET", "POST"],
    auth: false,
  },
  // Authenticated template management
  {
    prefix: "v1/templates",
    target: "/api/v1/projects/templates/",
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    auth: true,
  },
  // Showroom (public browse + order placement — no auth)
  {
    prefix: "v1/showroom/products",
    target: "/api/v1/showroom/products/",
    methods: ["GET", "POST"],
    auth: false,
  },
  // Showroom authenticated (buyer orders + vendor dashboard)
  {
    prefix: "v1/showroom",
    target: "/api/v1/showroom/",
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    auth: true,
  },
  // Social feed (public)
  {
    prefix: "v1/social/feed",
    target: "/api/v1/social/feed/",
    methods: ["GET"],
    auth: false,
  },
  // Social (authenticated — save, saved posts)
  {
    prefix: "v1/social",
    target: "/api/v1/social/",
    methods: ["GET", "POST", "DELETE"],
    auth: true,
  },
  {
    prefix: "v1/events",
    target: "/api/v1/events/",
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    auth: true,
  },
  {
    prefix: "v1/communications",
    target: "/api/v1/communications/",
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    auth: true,
  },
  {
    prefix: "v1/billing",
    target: "/api/v1/billing/",
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    auth: true,
  },
  {
    prefix: "v1/users/leads",
    target: "/api/v1/users/leads/",
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    auth: true,
  },
  {
    prefix: "v1/users",
    target: "/api/v1/users/",
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    auth: true,
  },
  {
    prefix: "v1/core",
    target: "/api/v1/core/",
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    auth: true,
  },
  {
    prefix: "v1/ai",
    target: "/api/v1/ai/",
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    auth: true,
  },
];
