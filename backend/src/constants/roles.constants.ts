export const USER_ROLES = {
  ADMIN: "admin",
  COORDINATOR: "coordinator",
  FIELD_USER: "field_user",
} as const;

export type UserRole = (typeof USER_ROLES)[keyof typeof USER_ROLES];
