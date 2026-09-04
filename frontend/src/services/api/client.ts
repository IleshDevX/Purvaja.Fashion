import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import { config } from '../../app/config.js';

export interface ApiErrorResponse {
  code: string;
  message: string;
  details?: unknown;
}

export class ApiError extends Error {
  public readonly code: string;
  public readonly statusCode?: number;
  public readonly details?: unknown;

  constructor(message: string, code = 'API_ERROR', statusCode?: number, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }
}

export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
  message?: string;
}

export function unwrapApiData<T>(payload: unknown): T {
  if (
    typeof payload === 'object' &&
    payload !== null &&
    'success' in payload &&
    (payload as { success?: unknown }).success === false
  ) {
    const error = (payload as { error?: ApiErrorResponse }).error;
    throw new ApiError(error?.message ?? 'The request could not be completed.', error?.code);
  }

  if (
    typeof payload === 'object' &&
    payload !== null &&
    'data' in payload &&
    (payload as { success?: unknown }).success === true
  ) {
    return (payload as ApiSuccessResponse<T>).data;
  }

  return payload as T;
}

export function createApiClient(): AxiosInstance {
  const instance = axios.create({
    baseURL: config.apiUrl,
    timeout: 15000,
    headers: {
      'Content-Type': 'application/json',
    },
    withCredentials: true,
  });

  instance.interceptors.request.use(
    (requestConfig: InternalAxiosRequestConfig) => {
      return requestConfig;
    },
    (error: unknown) => Promise.reject(error),
  );

  instance.interceptors.response.use(
    response => response,
    (error: AxiosError<{ success?: boolean; error?: ApiErrorResponse }>) => {
      if (error.response?.data?.error) {
        const { message, code, details } = error.response.data.error;
        return Promise.reject(new ApiError(message, code, error.response.status, details));
      }

      if (error.request) {
        return Promise.reject(
          new ApiError('Network error: No response received from server', 'NETWORK_ERROR'),
        );
      }

      return Promise.reject(new ApiError(error.message, 'REQUEST_SETUP_ERROR'));
    },
  );

  return instance;
}

export const apiClient = createApiClient();
