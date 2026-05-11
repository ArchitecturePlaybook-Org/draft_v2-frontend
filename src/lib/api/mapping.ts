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
    prefix: "projects",
    target: "/api/projects/",
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    auth: true,
  },
];
