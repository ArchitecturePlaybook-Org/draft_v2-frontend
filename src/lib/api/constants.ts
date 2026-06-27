export const DJANGO_API_URL = process.env.DJANGO_API_URL || "http://127.0.0.1:8000";
export const COOKIE_ACCESS_TOKEN = "access_token";
export const COOKIE_REFRESH_TOKEN = "refresh_token";
export const COOKIE_USER_ROLE = "user_role";

export const ACCESS_TOKEN_MAX_AGE = 60 * 60 * 24; // 1 day
export const REFRESH_TOKEN_MAX_AGE = 60 * 60 * 24 * 7; // 7 days
export const REMEMBER_ME_MAX_AGE = 60 * 60 * 24 * 90; // 90 days
