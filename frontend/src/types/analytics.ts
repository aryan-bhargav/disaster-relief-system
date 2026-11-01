export interface CategoryDistribution {
  category: string;
  totalUnits: number;
  requestCount: number;
  allocatedUnits: number;
}

export interface CentreLoadMetric {
  centreId: string;
  centreName: string;
  totalStockUnits: number;
  activeAllocations: number;
  dispatchedAllocations: number;
  deliveredAllocations: number;
}

export interface AnalyticsData {
  summary: {
    totalRequests: number;
    fulfilledRequests: number;
    fulfillmentRatePct: number;
    totalStockAvailable: number;
    totalUnitsAllocated: number;
    totalUnitsDelivered: number;
    activeReliefCentres: number;
    totalRegisteredUsers: number;
  };
  categoryDistributions: CategoryDistribution[];
  centreLoads: CentreLoadMetric[];
  priorityBreakdown: Record<string, number>;
  statusFunnel: {
    pending: number;
    partially_allocated: number;
    allocated: number;
    dispatched: number;
    delivered: number;
    cancelled: number;
  };
}
