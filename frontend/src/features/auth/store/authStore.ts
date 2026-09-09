import { create } from 'zustand';
import {
  AuthState,
  LoginCredentials,
  RegisterCredentials,
  ForgotPasswordRequest,
  ResetPasswordRequest,
} from '../types/auth.js';
import { authService } from '../services/authService.js';
import { ApiError } from '../../../services/api/client.js';

function parseAuthError(err: unknown, fallback: string): { message: string; fieldErrors: Record<string, string[]> | null } {
  if (err instanceof ApiError) {
    if (err.details && typeof err.details === 'object' && 'fieldErrors' in err.details) {
      const fieldErrors = (err.details as { fieldErrors?: Record<string, string[]> }).fieldErrors;
      if (fieldErrors && Object.keys(fieldErrors).length > 0) {
        const errorList = Object.values(fieldErrors).flat().filter(Boolean);
        if (errorList.length > 0) {
          return { message: errorList.join(' '), fieldErrors };
        }
      }
    }
    return { message: err.message || fallback, fieldErrors: null };
  }
  return { message: err instanceof Error ? err.message : fallback, fieldErrors: null };
}

let authGeneration = 0;
export const useAuthStore = create<AuthState>()((set, get) => ({
      user: null,
      status: 'loading',
      isInitializing: true,
      isLoading: false,
      error: null,
      fieldErrors: null,

      login: async (credentials: LoginCredentials): Promise<boolean> => {
        const generation = ++authGeneration;
        set({ isLoading: true, error: null, fieldErrors: null });
        try {
          const user = await authService.login(credentials);
          if (generation !== authGeneration) return false;
          set({ user, status: 'authenticated', isLoading: false, error: null, fieldErrors: null });
          return true;
        } catch (err: unknown) {
          if (generation !== authGeneration) return false;
          const { message, fieldErrors } = parseAuthError(err, 'Unable to sign in. Please check your details and try again.');
          set({ error: message, fieldErrors, isLoading: false });
          return false;
        }
      },

      register: async (credentials: RegisterCredentials): Promise<boolean> => {
        const generation = ++authGeneration;
        set({ isLoading: true, error: null, fieldErrors: null });
        try {
          const user = await authService.register(credentials);
          if (generation !== authGeneration) return false;
          set({ user, status: 'authenticated', isLoading: false, error: null, fieldErrors: null });
          return true;
        } catch (err: unknown) {
          if (generation !== authGeneration) return false;
          const { message, fieldErrors } = parseAuthError(err, 'Unable to create account. Please check your details and try again.');
          set({ error: message, fieldErrors, isLoading: false });
          return false;
        }
      },

      forgotPassword: async (request: ForgotPasswordRequest): Promise<boolean> => {
        const generation = authGeneration;
        set({ isLoading: true, error: null });
        try {
          await authService.forgotPassword(request);
          if (generation !== authGeneration) return false;
          set({ isLoading: false, error: null });
          return true;
        } catch {
          if (generation !== authGeneration) return false;
          set({ isLoading: false, error: 'Unable to process password reset request.' });
          return false;
        }
      },

      resetPassword: async (request: ResetPasswordRequest): Promise<boolean> => {
        const generation = authGeneration;
        set({ isLoading: true, error: null });
        try {
          await authService.resetPassword(request);
          if (generation !== authGeneration) return false;
          set({ isLoading: false, error: null });
          return true;
        } catch {
          if (generation !== authGeneration) return false;
          set({ isLoading: false, error: 'Unable to reset password. Please try again.' });
          return false;
        }
      },

      logout: async () => {
        const generation = ++authGeneration;
        set({ isLoading: true, error: null });
        try {
          await authService.logout();
          if (generation !== authGeneration) return false;
          set({ user: null, status: 'guest', isInitializing: false, error: null, isLoading: false, fieldErrors: null });
          return true;
        } catch {
          if (generation === authGeneration) set({ isLoading: false, error: 'Sign out could not be confirmed. Please reconnect and try again.' });
          return false;
        }
      },

      clearError: () => {
        set({ error: null, fieldErrors: null });
      },

      handleSessionExpired: () => {
        if (get().status === 'authenticated') {
          authGeneration++;
          set({
            user: null,
            status: 'guest',
            isInitializing: false,
            isLoading: false,
            error: 'Your session has expired. Please sign in again.',
            fieldErrors: null,
          });
        }
      },

      updateProfile: async (updated) => {
        const generation = authGeneration;
        set({ isLoading: true, error: null });
        try {
          const user = await authService.updateProfile(updated);
          if (generation !== authGeneration) return false;
          set({ user, isLoading: false });
          return true;
        } catch (err: unknown) {
          if (generation !== authGeneration) return false;
          const message = err instanceof Error ? err.message : 'Unable to update profile.';
          set({ error: message, isLoading: false });
          return false;
        }
      },

      initialize: async () => {
        set({ status: 'loading', isInitializing: true });
        const generation = ++authGeneration;
        try {
          const user = await authService.getCurrentUser();
          if (generation !== authGeneration) return;
          set({ user, status: 'authenticated', isInitializing: false, error: null });
        } catch {
          // An unauthenticated response is expected for first-time visitors.
          if (generation !== authGeneration) return;
          set({ user: null, status: 'guest', isInitializing: false, error: null });
        }
      },
    }));

import { onSessionExpired, advanceApiSession } from '../../../services/api/client.js';
useAuthStore.subscribe((state, previous) => {
  if (state.user?.id !== previous.user?.id || state.status !== previous.status) {
    authGeneration++;
    advanceApiSession();
  }
});
onSessionExpired(() => {
  useAuthStore.getState().handleSessionExpired();
});
