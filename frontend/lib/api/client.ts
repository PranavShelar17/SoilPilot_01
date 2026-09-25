import axios, { AxiosInstance, AxiosResponse, AxiosError } from "axios";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

export interface HealthCheckResponse {
  status: string;
  service: string;
}

export const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});

// Request interceptor to attach bearer token if available in sessionStorage
api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = sessionStorage.getItem("soilpilot_token");
    if (token && !config.headers.Authorization) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Response interceptor for centralized error handling and clean messaging
api.interceptors.response.use(
  (response: AxiosResponse) => response,
  (error: AxiosError) => {
    const data = error.response?.data as any;
    const detail = data?.detail;
    const message =
      (typeof detail === "string" ? detail : null) ||
      data?.message ||
      error.message ||
      "An unexpected error occurred";

    const enhancedError = new Error(message);
    (enhancedError as any).status = error.response?.status;
    (enhancedError as any).response = error.response;
    return Promise.reject(enhancedError);
  }
);

export const apiClient = {
  /**
   * Health check endpoint verifying backend availability
   */
  async getHealth(): Promise<HealthCheckResponse> {
    const response = await api.get<HealthCheckResponse>("/health");
    return response.data;
  },
};
