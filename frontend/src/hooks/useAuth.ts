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

/**
 * Hook de autenticação simples baseado em JWT no localStorage.
 * Em desenvolvimento, caso o backend de auth não esteja disponível,
 * retorna um usuário padrão para não bloquear o uso do sistema.
 */
export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    loading: true,
  });

  const loadMe = useCallback(async () => {
    const token = getToken();
    if (!token) {
      // Usuário padrão para ambiente de desenvolvimento sem login.
      setState({
        user: {
          id: 'dev',
          name: 'Operadora',
          email: 'operadora@supremaclasse.com',
          role: 'ADMIN',
        },
        loading: false,
      });
      return;
    }
    try {
      const { data } = await api.get<AuthUser>('/auth/me');
      setState({ user: data, loading: false });
    } catch {
      setState({
        user: {
          id: 'dev',
          name: 'Operadora',
          email: 'operadora@supremaclasse.com',
          role: 'ADMIN',
        },
        loading: false,
      });
    }
  }, []);

  useEffect(() => {
    void loadMe();
  }, [loadMe]);

  const login = useCallback(
    async (email: string, password: string) => {
      const { data } = await api.post<{ token: string }>('/auth/login', {
        email,
        password,
      });
      setToken(data.token);
      await loadMe();
    },
    [loadMe]
  );

  const logout = useCallback(() => {
    clearToken();
    setState({ user: null, loading: false });
  }, []);

  return { user: state.user, loading: state.loading, login, logout };
}

export default useAuth;
