import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import {
  User,
  AuthState,
  LoginCredentials,
  RegisterCredentials,
  ForgotPasswordRequest,
  ResetPasswordRequest,
} from '../types/auth.js';
import { authDevelopmentService } from '../services/authDevelopmentService.js';

export const useAuthStore = create<AuthState>()(
  persist(
    (set, _get) => ({
      user: null,
      status: 'guest',
      isLoading: false,
      error: null,

      login: async (credentials: LoginCredentials): Promise<boolean> => {
        set({ isLoading: true, error: null });
        try {
          const user = await authDevelopmentService.login(credentials);
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
          const user = await authDevelopmentService.register(credentials);
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
          await authDevelopmentService.forgotPassword(request);
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
          await authDevelopmentService.resetPassword(request);
          set({ isLoading: false, error: null });
          return true;
        } catch {
          set({ isLoading: false, error: 'Unable to reset password. Please try again.' });
          return false;
        }
      },

      logout: () => {
        set({ user: null, status: 'guest', error: null, isLoading: false });
      },

      clearError: () => {
        set({ error: null });
      },

      updateProfile: (updated: Partial<User>) => {
        set(state => ({
          user: state.user ? { ...state.user, ...updated } : null,
        }));
      },
    }),
    {
      name: 'purvaja-atelier-auth-session',
      storage: createJSONStorage(() => localStorage),
      partialize: state => ({ user: state.user, status: state.status }),
    }
  )
);
