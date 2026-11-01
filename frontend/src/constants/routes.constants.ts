export const APP_ROUTES = {
  HOME: "/",
  LOGIN: "/login",
  REGISTER: "/register",
  DASHBOARD: "/dashboard",
  REQUESTS: "/requests",
  RESOURCES: "/resources",
  CENTRES: "/centres",
  ALLOCATIONS: "/allocations",
  MAP: "/map",
  ANALYTICS: "/analytics",
  USERS: "/users",
} as const;

export const PUBLIC_ROUTES = [
  APP_ROUTES.HOME,
  APP_ROUTES.LOGIN,
  APP_ROUTES.REGISTER,
] as const;
