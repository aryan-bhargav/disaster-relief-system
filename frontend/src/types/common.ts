export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  count?: number;
}

export interface ApiErrorResponse {
  success: false;
  message: string;
  errors?: string[];
}

export interface GeoLocation {
  lat: number;
  lng: number;
}

export interface ToastMessage {
  text: string;
  type: "success" | "error" | "info" | "warning";
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  search?: string;
}
