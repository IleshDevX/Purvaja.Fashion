import { create } from 'zustand';
import {
  User,
  AuthState,
  LoginCredentials,
  RegisterCredentials,
  ForgotPasswordRequest,
  ResetPasswordRequest,
} from '../types/auth.js';
import { authService } from '../services/authService.js';

export const useAuthStore = create<AuthState>()(set => ({
      user: null,
      status: 'loading',
      isInitializing: true,
      isLoading: false,
      error: null,

      login: async (credentials: LoginCredentials): Promise<boolean> => {
        set({ isLoading: true, error: null });
        try {
          const user = await authService.login(credentials);
          set({ user, status: 'authenticated', isLoading: false, error: null });
          return true;
        } catch (err: unknown) {
          const message =
            err instanceof Error
              ? err.message
              : 'Unable to sign in. Please check your details and try again.';
          set({ error: message, isLoading: false });
          return false;
        }
      },

      register: async (credentials: RegisterCredentials): Promise<boolean> => {
        set({ isLoading: true, error: null });
        try {
          const user = await authService.register(credentials);
          set({ user, status: 'authenticated', isLoading: false, error: null });
          return true;
        } catch (err: unknown) {
          const message =
            err instanceof Error
              ? err.message
              : 'Unable to create account. Please check your details and try again.';
          set({ error: message, isLoading: false });
          return false;
        }
      },

      forgotPassword: async (request: ForgotPasswordRequest): Promise<boolean> => {
        set({ isLoading: true, error: null });
        try {
          await authService.forgotPassword(request);
          set({ isLoading: false, error: null });
          return true;
        } catch {
          set({ isLoading: false, error: 'Unable to process password reset request.' });
          return false;
        }
      },

      resetPassword: async (request: ResetPasswordRequest): Promise<boolean> => {
        set({ isLoading: true, error: null });
        try {
          await authService.resetPassword(request);
          set({ isLoading: false, error: null });
          return true;
        } catch {
          set({ isLoading: false, error: 'Unable to reset password. Please try again.' });
          return false;
        }
      },

      logout: () => {
        void authService.logout().catch(() => undefined);
        set({ user: null, status: 'guest', isInitializing: false, error: null, isLoading: false });
      },

      clearError: () => {
        set({ error: null });
      },

      updateProfile: async (updated: Pick<User, 'firstName' | 'lastName' | 'email'>) => {
        set({ isLoading: true, error: null });
        try {
          const user = await authService.updateProfile(updated);
          set({ user, isLoading: false });
          return true;
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : 'Unable to update profile.';
          set({ error: message, isLoading: false });
          return false;
        }
      },

      initialize: async () => {
        set({ status: 'loading', isInitializing: true });
        try {
          const user = await authService.getCurrentUser();
          set({ user, status: 'authenticated', isInitializing: false, error: null });
        } catch {
          // An unauthenticated response is expected for first-time visitors.
          set({ user: null, status: 'guest', isInitializing: false, error: null });
        }
      },
    }));
