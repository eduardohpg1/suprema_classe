import axios, { AxiosError } from 'axios';
import toast from 'react-hot-toast';

const TOKEN_KEY = 'sc_token';

export const getToken = (): string | null => localStorage.getItem(TOKEN_KEY);
export const setToken = (token: string): void =>
  localStorage.setItem(TOKEN_KEY, token);
export const clearToken = (): void => localStorage.removeItem(TOKEN_KEY);

const BASE_URL = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api`
  : '/api';

export const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT to every request
api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Centralized error handling
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError<{ message?: string; error?: string }>) => {
    const status = error.response?.status;
    const message =
      error.response?.data?.message ||
      error.response?.data?.error ||
      error.message ||
      'Erro inesperado';

    if (status === 409) {
      toast.error(message || 'Conflito de datas para este produto.');
    } else if (status && status >= 500) {
      toast.error('Erro no servidor. Tente novamente.');
    } else if (status && status !== 404) {
      toast.error(message);
    }

    return Promise.reject(error);
  }
);

/**
 * Normaliza a resposta paginada do backend ({ data, pagination })
 * para o formato PaginatedResponse usado no frontend.
 */
export interface BackendPaginated<T> {
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export function normalizePaginated<T>(res: BackendPaginated<T>) {
  return {
    data: res.data,
    total: res.pagination.total,
    page: res.pagination.page,
    limit: res.pagination.pageSize,
    totalPages: res.pagination.totalPages,
  };
}
