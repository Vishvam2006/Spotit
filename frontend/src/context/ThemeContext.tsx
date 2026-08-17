import { useEffect, useState, type ReactNode } from 'react';
import {
  ThemeContext,
  THEME_STORAGE_KEY,
  getInitialTheme,
  applyTheme,
  type Theme,
} from './theme-context';

interface ThemeProviderProps {
  children: ReactNode;
}

export default function ThemeProvider({ children }: ThemeProviderProps) {
  const [theme, setThemeState] = useState<Theme>(getInitialTheme);

  useEffect(() => {
    applyTheme(theme);
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);

    const root = document.documentElement;
    root.classList.add('theme-transition');
    const timeout = window.setTimeout(() => {
      root.classList.remove('theme-transition');
    }, 300);
    return () => window.clearTimeout(timeout);
  }, [theme]);

  const setTheme = (next: Theme) => setThemeState(next);

  const toggleTheme = () =>
    setThemeState((current) => (current === 'dark' ? 'light' : 'dark'));

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}