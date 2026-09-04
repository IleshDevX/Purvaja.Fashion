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

let inMemoryCsrfToken: string | null = null;

export function setCsrfToken(token: string | null): void {
  inMemoryCsrfToken = token;
}

export function getCsrfToken(): string | null {
  if (inMemoryCsrfToken) return inMemoryCsrfToken;
  if (typeof document !== 'undefined') {
    const fromCookie = document.cookie
      .split('; ')
      .find(value => value.startsWith('pf_csrf='))
      ?.split('=')[1];
    if (fromCookie) return decodeURIComponent(fromCookie);
  }
  return null;
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
    async (requestConfig: InternalAxiosRequestConfig) => {
      if (!['get', 'head', 'options'].includes(requestConfig.method?.toLowerCase() ?? 'get')) {
        let token = getCsrfToken();
        if (!token && typeof window !== 'undefined') {
          try {
            const csrfRes = await axios.get<{ success?: boolean; data?: { csrfToken?: string } }>(
              `${config.apiUrl}/auth/csrf`,
              { withCredentials: true },
            );
            token = csrfRes.data?.data?.csrfToken ?? null;
            if (token) setCsrfToken(token);
          } catch {
            // Proceed without token if CSRF endpoint fails
          }
        }
        if (token) {
          requestConfig.headers.set('X-CSRF-Token', token);
        }
      }
      return requestConfig;
    },
    (error: unknown) => Promise.reject(error),
  );

  instance.interceptors.response.use(
    response => {
      const responseCsrf = (response.data as { data?: { csrfToken?: string } })?.data?.csrfToken;
      if (responseCsrf) {
        setCsrfToken(responseCsrf);
      }
      return response;
    },
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
