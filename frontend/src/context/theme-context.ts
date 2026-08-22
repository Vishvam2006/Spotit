import { createContext, useContext } from 'react';

export type Theme = 'dark' | 'light';

export const THEME_STORAGE_KEY = 'pm-theme';

export function getInitialTheme(): Theme {
  return 'light';
}

export function applyTheme(theme: Theme) {
  document.documentElement.setAttribute('data-theme', theme);
}

// Runs before the first paint so a saved preference is applied immediately,
// avoiding a flash of the wrong theme on page refresh.
export function applyInitialTheme() {
  applyTheme(getInitialTheme());
}

export interface ThemeContextValue {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

export const ThemeContext = createContext<ThemeContextValue | null>(null);

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}