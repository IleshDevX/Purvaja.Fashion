import {
  User,
  LoginCredentials,
  RegisterCredentials,
  ForgotPasswordRequest,
  ResetPasswordRequest,
} from '../types/auth.js';
import { apiClient } from '../../../services/api/client.js';
import { unwrapApiData } from '../../../services/api/client.js';

function responseUser(payload: unknown): User {
  const candidate = (payload as { user?: User; data?: { user?: User } })?.user ??
    (payload as { data?: { user?: User } })?.data?.user;
  if (!candidate?.id || !candidate.email || !candidate.role) {
    throw new Error('Authentication response was invalid.');
  }
  return candidate;
}

export const authService = {
  async getCurrentUser(): Promise<User> {
    const response = await apiClient.get('/auth/me');
    return responseUser(unwrapApiData(response.data));
  },

  async login(credentials: LoginCredentials): Promise<User> {
    const response = await apiClient.post('/auth/login', credentials);
    return responseUser(unwrapApiData(response.data));
  },

  async register(credentials: RegisterCredentials): Promise<User> {
    const response = await apiClient.post('/auth/register', credentials);
    return responseUser(unwrapApiData(response.data));
  },

  async forgotPassword(request: ForgotPasswordRequest): Promise<void> {
    await apiClient.post('/auth/forgot-password', request);
  },

  async resetPassword(request: ResetPasswordRequest): Promise<void> {
    await apiClient.post('/auth/reset-password', request);
  },

  async updateProfile(updated: Pick<User, 'firstName' | 'lastName' | 'email'>): Promise<User> {
    const response = await apiClient.patch('/auth/me', updated);
    return responseUser(unwrapApiData(response.data));
  },

  async logout(): Promise<void> {
    await apiClient.post('/auth/logout');
  },
};
