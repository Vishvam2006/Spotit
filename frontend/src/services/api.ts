import axios from "axios";
import type { ApiErrorResponse } from "../types";

export const UNAUTHORIZED_EVENT = "parkmitra:unauthorized";

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? "/api",
  headers: {
    "Content-Type": "application/json",
  },
  timeout: Number(import.meta.env.VITE_API_TIMEOUT_MS ?? 15000),
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("parkmitra_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      window.dispatchEvent(new Event(UNAUTHORIZED_EVENT));
    }
    return Promise.reject(error);
  }
);

export function isNetworkError(error: unknown): boolean {
  return axios.isAxiosError(error) && !error.response;
}

export type ApiFailureKind =
  | "network"
  | "timeout"
  | "auth"
  | "server"
  | "client";

export function getApiFailureKind(error: unknown): ApiFailureKind {
  if (axios.isAxiosError(error)) {
    if (error.code === "ECONNABORTED") return "timeout";
    if (!error.response) return "network";

    const status = error.response.status;
    if (status === 401) return "auth";
    if (status >= 500) return "server";
    return "client";
  }
  return "client";
}

export function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError<ApiErrorResponse>(error)) {
    const { response } = error;
    const status = response?.status;
    const serverMessage = response?.data?.message;

    if (serverMessage) return serverMessage;

    if (error.code === "ECONNABORTED") {
      return "The request took too long to complete. Please check your connection and try again.";
    }

    if (!response) {
      return "You appear to be offline. Check your internet connection and try again.";
    }

    if (status === 401) return "Your session has expired. Please log in again.";
    if (status === 403) return "You are not allowed to perform this action.";
    if (status === 404) return "The requested resource could not be found.";
    if (status === 409)
      return "This action could not be completed because of a conflict. Please refresh and try again.";
    if (status === 429)
      return "You have made too many requests. Please wait a moment and try again.";
    if (status !== undefined && status >= 500)
      return "The server is having trouble. Please try again shortly.";

    return `Request failed${status ? ` (${status})` : ""}. Please try again.`;
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "Something went wrong. Please try again.";
}
