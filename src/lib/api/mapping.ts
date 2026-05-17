import { ApiRouteConfig } from "./types";

export const API_ROUTES: ApiRouteConfig[] = [
  {
    prefix: "auth/login",
    target: "/api/users/auth/login/",
    methods: ["POST"],
    auth: false,
    cookieStrategy: "set-auth",
  },
  {
    prefix: "auth/register",
    target: "/api/users/auth/register/",
    methods: ["POST"],
    auth: false,
    cookieStrategy: "set-auth",
  },
  {
    prefix: "auth/refresh",
    target: "/api/users/auth/token/refresh/",
    methods: ["POST"],
    auth: false,
    cookieStrategy: "set-auth",
  },
  {
    prefix: "auth/logout",
    target: "",
    methods: ["POST"],
    auth: false,
    cookieStrategy: "clear-auth",
  },
  {
    prefix: "auth/me",
    target: "/api/users/profile/",
    methods: ["GET"],
    auth: true,
  },
  {
    prefix: "auth/profile",
    target: "/api/users/profile/",
    methods: ["GET", "PATCH"],
    auth: true,
  },
  {
    prefix: "orgs",
    target: "/api/accounts/",
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    auth: true,
  },
  {
    prefix: "projects/task-asset-links",
    target: "/api/projects/task-asset-links/",
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    auth: true,
  },
  {
    prefix: "projects",
    target: "/api/projects/",
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    auth: true,
  },
  {
    prefix: "events",
    target: "/api/events/",
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    auth: true,
  },
  {
    prefix: "communications",
    target: "/api/communications/inbox/",
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    auth: true,
  },
  {
    prefix: "billing",
    target: "/api/billing/subscription/",
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    auth: true,
  },
  {
    prefix: "users/leads",
    target: "/api/users/leads/",
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    auth: true,
  },
  {
    prefix: "users",
    target: "/api/users/",
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    auth: true,
  },
];
