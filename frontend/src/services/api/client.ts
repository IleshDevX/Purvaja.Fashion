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
let apiSession = 0;
type SessionRequest = InternalAxiosRequestConfig & { _session?: number; _retryCsrf?: boolean };

export function advanceApiSession(): void {
  apiSession++;
  setCsrfToken(null);
}

function assertCurrentSession(request?: SessionRequest): void {
  if (request?._session !== undefined && request._session !== apiSession) {
    throw new ApiError('Your session changed. Please try again.', 'SESSION_CHANGED');
  }
}

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

type SessionExpiredHandler = () => void;
let sessionExpiredHandler: SessionExpiredHandler | null = null;

export function onSessionExpired(handler: SessionExpiredHandler): void {
  sessionExpiredHandler = handler;
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
      const request = requestConfig as SessionRequest;
      assertCurrentSession(request);
      request._session ??= apiSession;
      if (!['get', 'head', 'options'].includes(requestConfig.method?.toLowerCase() ?? 'get')) {
        let token = getCsrfToken();
        if (!token && typeof window !== 'undefined') {
          try {
            const csrfRes = await axios.get<{ success?: boolean; data?: { csrfToken?: string } }>(
              `${config.apiUrl}/auth/csrf`,
              { withCredentials: true },
            );
            token = csrfRes.data?.data?.csrfToken ?? null;
            assertCurrentSession(request);
            if (token) setCsrfToken(token);
          } catch {
            // Proceed without token if CSRF endpoint fails
          }
        }
        if (token) {
          requestConfig.headers.set('X-CSRF-Token', token);
        }
      }
      assertCurrentSession(request);
      return requestConfig;
    },
    (error: unknown) => Promise.reject(error),
  );

  instance.interceptors.response.use(
    response => {
      assertCurrentSession(response.config as SessionRequest);
      const responseCsrf = (response.data as { data?: { csrfToken?: string } })?.data?.csrfToken;
      if (responseCsrf) {
        setCsrfToken(responseCsrf);
      }
      return response;
    },
    async (error: AxiosError<{ success?: boolean; error?: ApiErrorResponse }>) => {
      if (error instanceof ApiError) return Promise.reject(error);
      const originalRequest = error.config as SessionRequest | undefined;
      assertCurrentSession(originalRequest);
      const errorCode = error.response?.data?.error?.code;

      // Automatically retry once if CSRF token expired or became invalid
      if (
        error.response?.status === 403 &&
        errorCode === 'CSRF_INVALID' &&
        originalRequest &&
        !originalRequest._retryCsrf &&
        typeof window !== 'undefined'
      ) {
        originalRequest._retryCsrf = true;
        try {
          const csrfRes = await axios.get<{ success?: boolean; data?: { csrfToken?: string } }>(
            `${config.apiUrl}/auth/csrf`,
            { withCredentials: true },
          );
          const newToken = csrfRes.data?.data?.csrfToken ?? null;
          assertCurrentSession(originalRequest);
          if (newToken) {
            setCsrfToken(newToken);
            originalRequest.headers.set('X-CSRF-Token', newToken);
            return instance(originalRequest);
          }
        } catch {
          // Fall through to reject
        }
      }

      // Handle 401 Unauthorized -> trigger session expiration handler
      assertCurrentSession(originalRequest);
      if (error.response?.status === 401) {
        const url = originalRequest?.url || '';
        const isAuthCheck = url.includes('/auth/me') || url.includes('/auth/login') || url.includes('/auth/csrf');
        if (!isAuthCheck && sessionExpiredHandler) {
          sessionExpiredHandler();
        }
      }

      if (error.response?.data?.error) {
        const { message, code, details } = error.response.data.error;
        return Promise.reject(new ApiError(message, code, error.response.status, details));
      }

      if (error.request) {
        return Promise.reject(
          new ApiError(
            'Network error: Unable to connect to the server. Please check your connection.',
            'NETWORK_ERROR',
          ),
        );
      }

      return Promise.reject(new ApiError(error.message, 'REQUEST_SETUP_ERROR'));
    },
  );

  return instance;
}

export const apiClient = createApiClient();
