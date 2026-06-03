import { useCallback, useEffect, useState } from 'react';
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
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({ user: null, loading: true });

  const loadMe = useCallback(async () => {
    const token = getToken();
    if (!token) {
      setState({ user: null, loading: false });
      return;
    }
    try {
      const { data } = await api.get<AuthUser>('/auth/me');
      setState({ user: data, loading: false });
    } catch {
      clearToken();
      setState({ user: null, loading: false });
    }
  }, []);

  useEffect(() => { void loadMe(); }, [loadMe]);

  const login = useCallback(async (email: string, password: string) => {
    const { data } = await api.post<{ token: string; user: AuthUser }>('/auth/login', { email, password });
    setToken(data.token);
    setState({ user: data.user, loading: false });
  }, []);

  const logout = useCallback(() => {
    clearToken();
    setState({ user: null, loading: false });
  }, []);

  return { user: state.user, loading: state.loading, login, logout };
}

export default useAuth;
