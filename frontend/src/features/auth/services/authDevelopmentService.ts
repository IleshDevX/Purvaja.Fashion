import {
  User,
  LoginCredentials,
  RegisterCredentials,
  ForgotPasswordRequest,
  ResetPasswordRequest,
} from '../types/auth.js';
import { apiClient } from '../../../services/api/client.js';
import { config } from '../../../app/config.js';

function responseUser(payload: unknown): User {
  const candidate = (payload as { user?: User; data?: { user?: User } })?.user ??
    (payload as { data?: { user?: User } })?.data?.user;
  if (!candidate?.id || !candidate.email || !candidate.role) {
    throw new Error('Authentication response was invalid.');
  }
  return candidate;
}

export const authDevelopmentService = {
  async login(credentials: LoginCredentials): Promise<User> {
    if (config.isProd) {
      const response = await apiClient.post('/auth/login', credentials);
      return responseUser(response.data);
    }
    await new Promise(resolve => setTimeout(resolve, 300));

    if (
      credentials.email.toLowerCase() === 'invalid@error.com' ||
      credentials.email.toLowerCase() === 'fail@example.com'
    ) {
      throw new Error('Unable to sign in. Please check your details and try again.');
    }

    const isAdmin = credentials.email.toLowerCase().includes('admin');
    return {
      id: isAdmin ? 'usr-admin-001' : 'usr-dev-001',
      firstName: isAdmin ? 'Purvaja' : 'Alexander',
      lastName: isAdmin ? 'Admin' : 'Wright',
      email: credentials.email.trim().toLowerCase(),
      role: isAdmin ? 'admin' : 'customer',
    };
  },

  async register(credentials: RegisterCredentials): Promise<User> {
    if (config.isProd) {
      const response = await apiClient.post('/auth/register', credentials);
      return responseUser(response.data);
    }
    await new Promise(resolve => setTimeout(resolve, 300));

    if (credentials.email.toLowerCase() === 'exists@error.com') {
      throw new Error('An account with this email address already exists.');
    }

    return {
      id: `usr-dev-${Date.now().toString().slice(-4)}`,
      firstName: credentials.firstName.trim(),
      lastName: credentials.lastName.trim(),
      email: credentials.email.trim().toLowerCase(),
      role: 'customer',
    };
  },

  async forgotPassword(request: ForgotPasswordRequest): Promise<boolean> {
    if (config.isProd) {
      await apiClient.post('/auth/forgot-password', request);
      return true;
    }
    await new Promise(resolve => setTimeout(resolve, 300));
    return true;
  },

  async resetPassword(request: ResetPasswordRequest): Promise<boolean> {
    if (config.isProd) {
      await apiClient.post('/auth/reset-password', request);
      return true;
    }
    await new Promise(resolve => setTimeout(resolve, 300));
    return true;
  },
};
