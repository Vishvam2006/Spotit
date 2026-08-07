import { Navigate, useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';
import FullScreenLoader from './FullScreenLoader';
import { useAuth } from '../context/auth-context';

export default function ProtectedRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated, isInitializing } = useAuth();
  const location = useLocation();

  if (isInitializing) {
    return <FullScreenLoader />;
  }

  if (!isAuthenticated) {
    return (
      <Navigate to="/login" replace state={{ from: location.pathname }} />
    );
  }

  return <>{children}</>;
}