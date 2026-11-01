import { Request, Response } from "express";
import ReliefRequest from "../models/ReliefRequest.js";
import Resource from "../models/Resource.js";
import ReliefCentre from "../models/ReliefCentre.js";
import Allocation from "../models/Allocation.js";
import User from "../models/User.js";
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

/**
 * Comprehensive Reports & Analytics endpoint (for Administrator & Coordinator)
 * Fulfills Level 0 DFD: Reports & Analytics (Requests, Allocations, Inventory, Centers)
 */
export async function getAnalyticsData(
  _req: Request,
  res: Response
): Promise<void> {
  try {
    const [
      totalRequests,
      fulfilledRequests,
      activeCentres,
      totalUsers,
      stockSummary,
      allocatedSummary,
      deliveredSummary,
      categoryReqAgg,
      categoryStockAgg,
      centreDocs,
      statusFunnelAgg,
      priorityAgg,
    ] = await Promise.all([
      ReliefRequest.countDocuments(),
      ReliefRequest.countDocuments({ status: { $in: ["allocated", "dispatched", "delivered"] } }),
      ReliefCentre.countDocuments({ isActive: true }),
      User.countDocuments({ isActive: true }),

      // Total units available in inventory
      Resource.aggregate([
        { $group: { _id: null, totalUnits: { $sum: "$quantity" } } },
      ]),

      // Total units allocated (non-cancelled)
      Allocation.aggregate([
        { $match: { status: { $ne: "cancelled" } } },
        { $group: { _id: null, totalAllocated: { $sum: "$quantity" } } },
      ]),

      // Total units delivered
      Allocation.aggregate([
        { $match: { status: "delivered" } },
        { $group: { _id: null, totalDelivered: { $sum: "$quantity" } } },
      ]),

      // Requests per category
      ReliefRequest.aggregate([
        { $group: { _id: "$category", count: { $sum: 1 }, needed: { $sum: "$quantityNeeded" } } },
      ]),

      // Available stock per category
      Resource.aggregate([
        { $group: { _id: "$category", quantity: { $sum: "$quantity" } } },
      ]),

      // All centres with their active stock and allocations
      ReliefCentre.find({ isActive: true }).select("_id name address"),

      // Status funnel
      ReliefRequest.aggregate([
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ]),

      // Priority distribution
      ReliefRequest.aggregate([
        { $group: { _id: "$priority", count: { $sum: 1 } } },
      ]),
    ]);

    const totalStockAvailable = stockSummary[0]?.totalUnits || 0;
    const totalUnitsAllocated = allocatedSummary[0]?.totalAllocated || 0;
    const totalUnitsDelivered = deliveredSummary[0]?.totalDelivered || 0;
    const fulfillmentRatePct = totalRequests > 0
      ? Math.round((fulfilledRequests / totalRequests) * 100)
      : 0;

    // Build status funnel mapping
    const statusFunnel: Record<string, number> = {
      pending: 0,
      partially_allocated: 0,
      allocated: 0,
      dispatched: 0,
      delivered: 0,
      cancelled: 0,
    };
    for (const item of statusFunnelAgg) {
      if (typeof item._id === "string") {
        statusFunnel[item._id] = item.count;
      }
    }

    // Build priority breakdown mapping
    const priorityBreakdown: Record<string, number> = {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
    };
    for (const item of priorityAgg) {
      if (typeof item._id === "string") {
        priorityBreakdown[item._id] = item.count;
      }
    }

    // Build category distribution matrix
    const stockMap = new Map<string, number>();
    for (const item of categoryStockAgg) {
      if (typeof item._id === "string") {
        stockMap.set(item._id.toLowerCase(), item.quantity);
      }
    }

    const categoriesSet = new Set<string>([
      "food",
      "water",
      "medical",
      "shelter",
      "clothing",
      "other",
    ]);
    categoryReqAgg.forEach((r) => {
      if (r._id) categoriesSet.add(r._id.toLowerCase());
    });

    const categoryDistributions = Array.from(categoriesSet).map((cat) => {
      const reqMatch = categoryReqAgg.find((r) => (r._id || "").toLowerCase() === cat);
      return {
        category: cat,
        totalUnits: stockMap.get(cat) || 0,
        requestCount: reqMatch ? reqMatch.count : 0,
        allocatedUnits: reqMatch ? reqMatch.needed : 0,
      };
    });

    // Build centre loads
    const centreIds = centreDocs.map((c) => c._id);
    const [centreStockAgg, centreAllocAgg] = await Promise.all([
      Resource.aggregate([
        { $match: { centre: { $in: centreIds } } },
        { $group: { _id: "$centre", totalStock: { $sum: "$quantity" } } },
      ]),
      Allocation.aggregate([
        { $match: { centreId: { $in: centreIds } } },
        { $group: { _id: { centreId: "$centreId", status: "$status" }, count: { $sum: 1 } } },
      ]),
    ]);

    const centreStockMap = new Map<string, number>();
    for (const s of centreStockAgg) {
      centreStockMap.set(s._id.toString(), s.totalStock);
    }

    const centreLoads = centreDocs.map((c) => {
      const cIdStr = c._id.toString();
      let activeAllocations = 0;
      let dispatchedAllocations = 0;
      let deliveredAllocations = 0;

      centreAllocAgg.forEach((a) => {
        if (a._id?.centreId?.toString() === cIdStr) {
          if (a._id.status === "allocated") activeAllocations += a.count;
          if (a._id.status === "dispatched") dispatchedAllocations += a.count;
          if (a._id.status === "delivered") deliveredAllocations += a.count;
        }
      });

      return {
        centreId: cIdStr,
        centreName: c.name,
        totalStockUnits: centreStockMap.get(cIdStr) || 0,
        activeAllocations,
        dispatchedAllocations,
        deliveredAllocations,
      };
    });

    res.json({
      success: true,
      data: {
        summary: {
          totalRequests,
          fulfilledRequests,
          fulfillmentRatePct,
          totalStockAvailable,
          totalUnitsAllocated,
          totalUnitsDelivered,
          activeReliefCentres: activeCentres,
          totalRegisteredUsers: totalUsers,
        },
        categoryDistributions,
        centreLoads,
        priorityBreakdown,
        statusFunnel,
      },
    });
  } catch (error) {
    console.error("Analytics data error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to generate system analytics and reports",
    });
  }
}
