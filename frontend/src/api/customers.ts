import { api, normalizePaginated, BackendPaginated } from './client';
import { Customer, PaginatedResponse } from '../types';

export interface CustomerFilters {
  page?: number;
  pageSize?: number;
  search?: string;
}

export interface CustomerPayload {
  name: string;
  cpf: string;
  rg?: string;
  phone: string;
  address?: string;
  notes?: string;
}

export async function getCustomers(
  filters: CustomerFilters = {}
): Promise<PaginatedResponse<Customer>> {
  const params: Record<string, unknown> = {
    page: filters.page ?? 1,
    pageSize: filters.pageSize ?? 20,
  };
  if (filters.search) params.search = filters.search;

  const { data } = await api.get<BackendPaginated<Customer>>('/customers', {
    params,
  });
  return normalizePaginated(data);
}

export async function getCustomer(id: string): Promise<Customer> {
  const { data } = await api.get<Customer>(`/customers/${id}`);
  return data;
}

export async function createCustomer(
  payload: CustomerPayload
): Promise<Customer> {
  const { data } = await api.post<Customer>('/customers', payload);
  return data;
}

export async function updateCustomer(
  id: string,
  payload: Partial<CustomerPayload>
): Promise<Customer> {
  const { data } = await api.put<Customer>(`/customers/${id}`, payload);
  return data;
}

export async function deleteCustomer(id: string): Promise<void> {
  await api.delete(`/customers/${id}`);
}
