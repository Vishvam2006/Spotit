import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { api, UNAUTHORIZED_EVENT } from "../services/api";
import type { AuthResponse, MeResponse, User } from "../types";
import { AuthContext } from "./auth-context";

const TOKEN_KEY = "spotit_token";
const USER_KEY = "spotit_user";

function readStoredUser(): User | null {
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as User;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() =>
    localStorage.getItem(TOKEN_KEY)
  );
  const [user, setUser] = useState<User | null>(() => readStoredUser());
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    let active = true;

    const restoreSession = async () => {
      const storedToken = localStorage.getItem(TOKEN_KEY);

      if (!storedToken) {
        if (active) setIsInitializing(false);
        return;
      }

      try {
        const { data } = await api.get<MeResponse>("/auth/me");
        if (!active) return;
        setUser(data.user);
        setToken(storedToken);
      } catch {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
        if (active) {
          setUser(null);
          setToken(null);
        }
      } finally {
        if (active) setIsInitializing(false);
      }
    };

    restoreSession();

    return () => {
      active = false;
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const { data } = await api.post<AuthResponse>("/auth/login", {
      email,
      password,
    });

    localStorage.setItem(TOKEN_KEY, data.token);
    localStorage.setItem(USER_KEY, JSON.stringify(data.user));
    setToken(data.token);
    setUser(data.user);
    return data.user;
  }, []);

  const register = useCallback(
    async (fullName: string, email: string, password: string) => {
      const { data } = await api.post<AuthResponse>("/auth/register", {
        fullName,
        email,
        password,
      });

      localStorage.setItem(TOKEN_KEY, data.token);
      localStorage.setItem(USER_KEY, JSON.stringify(data.user));
      setToken(data.token);
      setUser(data.user);
    },
    []
  );

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setToken(null);
    setUser(null);
  }, []);

  useEffect(() => {
    const handleUnauthorized = () => {
      logout();
    };

    window.addEventListener(UNAUTHORIZED_EVENT, handleUnauthorized);
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, handleUnauthorized);
  }, [logout]);

  const value = useMemo(
    () => ({
      user,
      token,
      isAuthenticated: Boolean(token) && Boolean(user),
      isInitializing,
      login,
      register,
      logout,
    }),
    [user, token, isInitializing, login, register, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
