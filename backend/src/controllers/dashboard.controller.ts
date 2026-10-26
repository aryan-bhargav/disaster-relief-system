import { Request, Response } from "express";
import ReliefRequest from "../models/ReliefRequest.js";
import Resource from "../models/Resource.js";
import ReliefCentre from "../models/ReliefCentre.js";
import Allocation from "../models/Allocation.js";
import { AuthRequest } from "../middleware/authenticate.js";

export async function getDashboardStats(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const authReq = req as AuthRequest;
    const isFieldUser = authReq.user?.role === "field_user";
    const requestFilter = isFieldUser
      ? { requestedBy: authReq.user?.id }
      : {};

    const [
      totalRequests,
      pendingRequests,
      activeCentres,
      resourceMetrics,
      stockByCategory,
      requestsByPriority,
      allocationsByStatus,
      recentRequests,
    ] = await Promise.all([
      ReliefRequest.countDocuments(requestFilter),

      ReliefRequest.countDocuments({ ...requestFilter, status: "pending" }),

      ReliefCentre.countDocuments({ isActive: true }),

      // Distinct resource item count and low stock indicators
      Resource.aggregate([
        {
          $group: {
            _id: null,
            resourceCount: { $sum: 1 },
            lowStockItems: {
              $sum: {
                $cond: [{ $lte: ["$quantity", 10] }, 1, 0],
              },
            },
          },
        },
      ]),

      // Stock grouped cleanly by category to prevent misleading addition across units
      Resource.aggregate([
        {
          $group: {
            _id: "$category",
            count: { $sum: 1 },
            quantity: { $sum: "$quantity" },
          },
        },
      ]),

      ReliefRequest.aggregate([
        { $match: requestFilter },
        {
          $group: {
            _id: "$priority",
            count: { $sum: 1 },
          },
        },
      ]),

      Allocation.aggregate([
        {
          $group: {
            _id: "$status",
            count: { $sum: 1 },
          },
        },
      ]),

      ReliefRequest.find(requestFilter)
        .sort({ createdAt: -1 })
        .limit(5)
        .populate("requestedBy", "name")
        .populate("assignedCentre", "name"),
    ]);

    const metrics = resourceMetrics[0] ?? {
      resourceCount: 0,
      lowStockItems: 0,
    };

    const priorityStats: Record<string, number> = {
      low: 0,
      medium: 0,
      high: 0,
      critical: 0,
    };

    for (const item of requestsByPriority) {
      if (typeof item._id === "string") {
        priorityStats[item._id] = item.count;
      }
    }

    const allocationStats: Record<string, number> = {
      allocated: 0,
      dispatched: 0,
      delivered: 0,
      cancelled: 0,
    };

    for (const item of allocationsByStatus) {
      if (typeof item._id === "string") {
        allocationStats[item._id] = item.count;
      }
    }

    const categorizedStock: Record<string, number> = {};
    for (const item of stockByCategory) {
      if (typeof item._id === "string") {
        categorizedStock[item._id] = item.quantity;
      }
    }

    res.json({
      success: true,
      data: {
        overview: {
          totalRequests,
          pendingRequests,
          activeCentres,
          resourceTypes: metrics.resourceCount,
          // Preserving totalStock key for frontend compatibility, representing total active inventory items
          totalStock: metrics.resourceCount,
          lowStockItems: metrics.lowStockItems,
        },
        stockByCategory: categorizedStock,
        requestsByPriority: priorityStats,
        allocationsByStatus: allocationStats,
        recentRequests,
      },
    });
  } catch (error) {
    console.error("Dashboard stats error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to load dashboard statistics",
    });
  }
}
