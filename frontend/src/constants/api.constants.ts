export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: "/auth/login",
    REGISTER: "/auth/register",
    ME: "/auth/me",
  },
  DASHBOARD: {
    STATS: "/dashboard/stats",
    ANALYTICS: "/dashboard/analytics",
  },
  REQUESTS: {
    BASE: "/requests",
    BY_ID: (id: string) => `/requests/${id}`,
    CANCEL: (id: string) => `/requests/${id}/cancel`,
  },
  RESOURCES: {
    BASE: "/resources",
    BY_ID: (id: string) => `/resources/${id}`,
  },
  CENTRES: {
    BASE: "/centres",
    BY_ID: (id: string) => `/centres/${id}`,
  },
  ALLOCATIONS: {
    BASE: "/allocations",
    BY_ID: (id: string) => `/allocations/${id}`,
    STATUS: (id: string) => `/allocations/${id}/status`,
    CANCEL: (id: string) => `/allocations/${id}/cancel`,
  },
  USERS: {
    BASE: "/users",
    ROLE: (id: string) => `/users/${id}/role`,
    STATUS: (id: string) => `/users/${id}/status`,
  },
  OSRM_ROUTING: (originLng: number, originLat: number, destLng: number, destLat: number) =>
    `https://router.project-osrm.org/route/v1/driving/${originLng},${originLat};${destLng},${destLat}?overview=full&geometries=geojson`,
} as const;
