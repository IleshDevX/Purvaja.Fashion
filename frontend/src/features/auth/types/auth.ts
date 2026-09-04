export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: 'customer' | 'admin';
}

export type AuthStatus = 'guest' | 'authenticated' | 'loading';

export interface LoginCredentials {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface RegisterCredentials {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
  phone?: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  password: string;
  confirmPassword: string;
  token?: string;
}

export interface AuthState {
  user: User | null;
  status: AuthStatus;
  isInitializing: boolean;
  isLoading: boolean;
  error: string | null;
  login: (credentials: LoginCredentials) => Promise<boolean>;
  register: (credentials: RegisterCredentials) => Promise<boolean>;
  forgotPassword: (request: ForgotPasswordRequest) => Promise<boolean>;
  resetPassword: (request: ResetPasswordRequest) => Promise<boolean>;
  logout: () => void;
  clearError: () => void;
  updateProfile: (updated: Pick<User, 'firstName' | 'lastName' | 'email'>) => Promise<boolean>;
  initialize: () => Promise<void>;
}
