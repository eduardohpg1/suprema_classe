import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api, setToken, clearToken, getToken } from '../api/client';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'STAFF';
}

interface AuthState {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

export const AuthContext = createContext<AuthState>({
  user: null,
  loading: true,
  login: async () => {},
  logout: () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

export function useAuthProvider(): AuthState {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getToken();
    if (!token) { setLoading(false); return; }
    api.get<AuthUser>('/auth/me')
      .then(({ data }) => { setUser(data); setLoading(false); })
      .catch(() => { clearToken(); setUser(null); setLoading(false); });
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const { data } = await api.post<{ token: string; user: AuthUser }>('/auth/login', { email, password });
    setToken(data.token);
    setUser(data.user);
  }, []);

  const logout = useCallback(() => {
    clearToken();
    setUser(null);
  }, []);

  return { user, loading, login, logout };
}

export default useAuth;
