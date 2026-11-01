export interface OverviewMetrics {
  totalRequests: number;
  pendingRequests: number;
  activeCentres: number;
  resourceTypes: number;
  totalStock: number;
  lowStockItems: number;
}

export interface DashboardRecentRequest {
  _id: string;
  title: string;
  category: string;
  priority: string;
  status: string;
  createdAt: string;
  quantityNeeded?: number;
  quantityFulfilled?: number;
  unit?: string;
  requestedBy?: { name?: string } | string;
  assignedCentre?: { name?: string } | string;
}

export interface DashboardData {
  overview: OverviewMetrics;
  stockByCategory?: Record<string, number>;
  requestsByPriority: Record<string, number>;
  allocationsByStatus: Record<string, number>;
  recentRequests: DashboardRecentRequest[];
}
