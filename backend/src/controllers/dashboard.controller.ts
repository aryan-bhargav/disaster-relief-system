
import { Request, Response } from "express";
import ReliefRequest from "../models/ReliefRequest.js";
import Resource from "../models/Resource.js";
import ReliefCentre from "../models/ReliefCentre.js";
import Allocation from "../models/Allocation.js";

export async function getDashboardStats(
  _req: Request,
  res: Response
): Promise<void> {
  try {
    const [
      totalRequests,
      pendingRequests,
      activeCentres,
      resourceSummary,
      requestsByPriority,
      allocationsByStatus,
      recentRequests,
    ] = await Promise.all([
      ReliefRequest.countDocuments(),

      ReliefRequest.countDocuments({ status: "pending" }),

      ReliefCentre.countDocuments({ isActive: true }),

      Resource.aggregate([
        {
          $group: {
            _id: null,
            resourceTypes: { $sum: 1 },
            totalStock: { $sum: "$quantity" },
            lowStockItems: {
              $sum: {
                $cond: [{ $lte: ["$quantity", 10] }, 1, 0],
              },
            },
          },
        },
      ]),

      ReliefRequest.aggregate([
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

      ReliefRequest.find()
        .sort({ createdAt: -1 })
        .limit(5)
        .populate("requestedBy", "name")
        .populate("assignedCentre", "name"),
    ]);

    const stock = resourceSummary[0] ?? {
      resourceTypes: 0,
      totalStock: 0,
      lowStockItems: 0,
    };

    const priorityStats: Record<string, number> = {
      low: 0,
      medium: 0,
      high: 0,
      critical: 0,
    };

    for (const item of requestsByPriority) {
      priorityStats[item._id] = item.count;
    }

    const allocationStats: Record<string, number> = {
      allocated: 0,
      dispatched: 0,
      delivered: 0,
      cancelled: 0,
    };

    for (const item of allocationsByStatus) {
      allocationStats[item._id] = item.count;
    }

    res.json({
      success: true,
      data: {
        overview: {
          totalRequests,
          pendingRequests,
          activeCentres,
          resourceTypes: stock.resourceTypes,
          totalStock: stock.totalStock,
          lowStockItems: stock.lowStockItems,
        },
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
