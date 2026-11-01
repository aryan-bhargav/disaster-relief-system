import type { Request } from "express";
import type { UserRole } from "../constants/roles.constants.js";

export interface TokenPayload {
  userId: string;
  role: UserRole;
  email: string;
}

export interface AuthenticatedUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  isActive: boolean;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
}
