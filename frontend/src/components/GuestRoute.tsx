import { Navigate } from 'react-router-dom';
import type { ReactNode } from 'react';
import FullScreenLoader from './FullScreenLoader';
import { useAuth } from '../context/auth-context';

export default function GuestRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated, isInitializing, user } = useAuth();

  if (isInitializing) {
    return <FullScreenLoader />;
  }

  if (isAuthenticated) {
    if (user?.role === 'ADMIN') {
      return <Navigate to="/admin/dashboard" replace />;
    }
    if (user?.role === 'OWNER') {
      return <Navigate to="/dashboard" replace />;
    }
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}