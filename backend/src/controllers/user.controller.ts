import { Request, Response } from "express";
import mongoose from "mongoose";
import User, { UserRole } from "../models/User.js";
import { AuthRequest } from "../middleware/authenticate.js";

/**
 * List all registered users (Admin only)
 * Fulfills Level 0 DFD: Administrator -> Master Data (Users)
 */
export async function listUsers(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const users = await User.find()
      .select("-password")
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: users.length,
      data: users,
    });
  } catch (error) {
    console.error("List users error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve user list",
    });
  }
}

/**
 * Update user role (Admin only)
 * Prevents self-demotion if the admin is the sole admin in the system.
 */
export async function updateUserRole(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const authReq = req as AuthRequest;
    const { id } = req.params;
    const { role } = req.body;

    if (!mongoose.isValidObjectId(id)) {
      res.status(400).json({
        success: false,
        message: "Invalid user ID format",
      });
      return;
    }

    const validRoles: UserRole[] = ["admin", "coordinator", "field_user"];
    if (!role || !validRoles.includes(role)) {
      res.status(400).json({
        success: false,
        message: `Invalid role specified. Must be one of: ${validRoles.join(", ")}`,
      });
      return;
    }

    const targetUser = await User.findById(id);
    if (!targetUser) {
      res.status(404).json({
        success: false,
        message: "User not found",
      });
      return;
    }

    // Safety edge case: Admin cannot demote their own account
    if (authReq.user?.id === id && role !== "admin") {
      res.status(400).json({
        success: false,
        message: "Administrators cannot demote their own account. Another administrator must make this change.",
      });
      return;
    }

    // Safety edge case: Guard against demoting the sole active admin in the system
    if (targetUser.role === "admin" && role !== "admin") {
      const activeAdminCount = await User.countDocuments({
        role: "admin",
        isActive: true,
      });

      if (activeAdminCount <= 1) {
        res.status(400).json({
          success: false,
          message: "Cannot reassign role: at least one active administrator must remain in the system.",
        });
        return;
      }
    }

    targetUser.role = role;
    await targetUser.save();

    res.json({
      success: true,
      message: `User role successfully updated to '${role}'.`,
      data: {
        id: targetUser._id,
        name: targetUser.name,
        email: targetUser.email,
        role: targetUser.role,
        isActive: targetUser.isActive,
      },
    });
  } catch (error) {
    console.error("Update user role error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update user role",
    });
  }
}

/**
 * Toggle user active/inactive status (Admin only)
 * Prevents an admin from deactivating their own account.
 */
export async function toggleUserStatus(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const authReq = req as AuthRequest;
    const { id } = req.params;
    const { isActive } = req.body;

    if (!mongoose.isValidObjectId(id)) {
      res.status(400).json({
        success: false,
        message: "Invalid user ID format",
      });
      return;
    }

    if (typeof isActive !== "boolean") {
      res.status(400).json({
        success: false,
        message: "isActive must be a boolean (true or false)",
      });
      return;
    }

    // Safety edge case: Admin cannot deactivate their own active session
    if (authReq.user?.id === id && isActive === false) {
      res.status(400).json({
        success: false,
        message: "Administrators cannot deactivate their own account.",
      });
      return;
    }

    const targetUser = await User.findById(id);
    if (!targetUser) {
      res.status(404).json({
        success: false,
        message: "User not found",
      });
      return;
    }

    // Guard against deactivating the last active admin
    if (targetUser.role === "admin" && isActive === false) {
      const activeAdminCount = await User.countDocuments({
        role: "admin",
        isActive: true,
      });

      if (activeAdminCount <= 1) {
        res.status(400).json({
          success: false,
          message: "Cannot deactivate user: at least one active administrator must remain in the system.",
        });
        return;
      }
    }

    targetUser.isActive = isActive;
    await targetUser.save();

    res.json({
      success: true,
      message: `User account has been ${isActive ? "activated" : "deactivated"}.`,
      data: {
        id: targetUser._id,
        name: targetUser.name,
        email: targetUser.email,
        role: targetUser.role,
        isActive: targetUser.isActive,
      },
    });
  } catch (error) {
    console.error("Toggle user status error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update user status",
    });
  }
}
