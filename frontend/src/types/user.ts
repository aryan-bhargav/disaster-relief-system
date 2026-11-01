import type { UserRole } from "./auth";

export interface UserRecord {
  _id: string;
  name: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface UpdateUserRolePayload {
  role: UserRole;
}

export interface UpdateUserStatusPayload {
  isActive: boolean;
}
