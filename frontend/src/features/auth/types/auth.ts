export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string | null;
  preferredFit?: 'Slim' | 'Regular' | 'Relaxed' | null;
  preferredCollar?: 'Spread Collar' | 'Button-Down Collar' | 'Mandarin Collar' | 'Cuban Collar' | 'Cutaway Collar' | null;
  pendingEmail?: string | null;
  status?: 'active' | 'suspended' | 'deleted';
  emailVerified?: boolean;
  role: 'customer' | 'admin';
}

export type ProfileUpdate = Partial<Pick<User, 'firstName' | 'lastName' | 'email' | 'phone' | 'preferredFit' | 'preferredCollar'>>;

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
  fieldErrors?: Record<string, string[]> | null;
  login: (credentials: LoginCredentials) => Promise<boolean>;
  register: (credentials: RegisterCredentials) => Promise<boolean>;
  forgotPassword: (request: ForgotPasswordRequest) => Promise<boolean>;
  resetPassword: (request: ResetPasswordRequest) => Promise<boolean>;
  logout: () => Promise<boolean>;
  clearError: () => void;
  updateProfile: (updated: ProfileUpdate) => Promise<boolean>;
  initialize: () => Promise<void>;
  handleSessionExpired: () => void;
}
