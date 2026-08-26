import { createContext, useContext } from 'react';
import type { User } from '../types';

export interface OpenAuthModalOptions {
  title?: string;
  subtitle?: string;
  initialMode?: 'login' | 'register';
  onSuccess?: () => void;
}

export interface AuthContextValue {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isInitializing: boolean;
  login: (email: string, password: string) => Promise<User>;
  register: (fullName: string, email: string, password: string) => Promise<void>;
  forgotPassword: (email: string) => Promise<void>;
  verifyOtp: (email: string, otp: string) => Promise<void>;
  resetPassword: (email: string, otp: string, newPassword: string) => Promise<User>;
  logout: () => void;
  openAuthModal: (options?: OpenAuthModalOptions) => void;
  closeAuthModal: () => void;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}