import { Navigate } from 'react-router-dom';
import type { ReactNode } from 'react';
import FullScreenLoader from './FullScreenLoader';
import { useAuth } from '../context/auth-context';

export default function GuestRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated, isInitializing } = useAuth();

  if (isInitializing) {
    return <FullScreenLoader />;
  }

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}