import type { ReactNode } from 'react';
import Navbar from './Navbar';

interface AppLayoutProps {
  children: ReactNode;
  maxWidth?: string;
}

export default function AppLayout({
  children,
  maxWidth = 'max-w-7xl',
}: AppLayoutProps) {
  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <Navbar />
      <main className={`mx-auto flex w-full flex-1 flex-col ${maxWidth}`}>
        {children}
      </main>
    </div>
  );
}
