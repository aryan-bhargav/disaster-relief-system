
import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User, { UserRole } from "../models/User";

const allowedRoles: UserRole[] = [
  "admin",
  "coordinator",
  "field_user",
];

function createToken(userId: string, role: UserRole): string {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new Error("JWT_SECRET is not configured");
  }

  return jwt.sign({ id: userId, role }, secret, {
    expiresIn: "1d",
  });
}

function userResponse(user: {
  _id: unknown;
  name: string;
  email: string;
  role: UserRole;
}) {
  return {
    id: String(user._id),
    name: user.name,
    email: user.email,
    role: user.role,
  };
}

export async function register(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const { name, email, password } = req.body;

    if (
      typeof name !== "string" ||
      typeof email !== "string" ||
      typeof password !== "string" ||
      !name.trim() ||
      !email.trim() ||
      password.length < 8
    ) {
      res.status(400).json({
        success: false,
        message: "Name, valid email and password of at least 8 characters are required",
      });
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();

    const existingUser = await User.findOne({
      email: normalizedEmail,
    });

    if (existingUser) {
      res.status(409).json({
        success: false,
        message: "Email is already registered",
      });
      return;
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      password: hashedPassword,
      role: "field_user",
    });

    const token = createToken(String(user._id), user.role);

    res.status(201).json({
      success: true,
      message: "Registration successful",
      token,
      user: userResponse(user),
    });
  } catch (error) {
    const mongoError = error as { code?: number };

    if (mongoError.code === 11000) {
      res.status(409).json({
        success: false,
        message: "Email is already registered",
      });
      return;
    }

    console.error("Registration error:", error);
    res.status(500).json({
      success: false,
      message: "Could not register user",
    });
  }
}

export async function login(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const { email, password } = req.body;

    if (
      typeof email !== "string" ||
      typeof password !== "string" ||
      !email.trim() ||
      !password
    ) {
      res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
      return;
    }

    const user = await User.findOne({
      email: email.trim().toLowerCase(),
    }).select("+password");

    if (!user || !(await bcrypt.compare(password, user.password))) {
      res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
      return;
    }

    if (!user.isActive) {
      res.status(403).json({
        success: false,
        message: "This account is inactive",
      });
      return;
    }

    const token = createToken(String(user._id), user.role);

    res.json({
      success: true,
      message: "Login successful",
      token,
      user: userResponse(user),
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({
      success: false,
      message: "Could not log in",
    });
  }
}

export async function getMe(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const authReq = req as Request & {
      user?: { id: string };
    };

    if (!authReq.user) {
      res.status(401).json({
        success: false,
        message: "Authentication required",
      });
      return;
    }

    const user = await User.findById(authReq.user.id);

    if (!user || !user.isActive) {
      res.status(401).json({
        success: false,
        message: "User account not found or inactive",
      });
      return;
    }

    res.json({
      success: true,
      user: userResponse(user),
    });
  } catch (error) {
    console.error("Get profile error:", error);
    res.status(500).json({
      success: false,
      message: "Could not fetch user profile",
    });
  }
}
