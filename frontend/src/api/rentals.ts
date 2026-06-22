import { api, normalizePaginated, BackendPaginated } from './client';
import { Rental, PaginatedResponse, RentalStatus } from '../types';

export interface RentalFilters {
  page?: number;
  pageSize?: number;
  status?: RentalStatus | '';
  customerId?: string;
  from?: string;
  to?: string;
  search?: string;
}

export interface RentalItemPayload {
  productId: string;
  quantity?: number;
}

export interface RentalPayload {
  items: RentalItemPayload[];
  customerId: string;
  pickupDate: string;
  returnDate: string;
  totalValue: number;
  depositValue: number;
  remainingValue: number;
  notes?: string;
}

export async function getRentals(
  filters: RentalFilters = {}
): Promise<PaginatedResponse<Rental>> {
  const params: Record<string, unknown> = {
    page: filters.page ?? 1,
    pageSize: filters.pageSize ?? 20,
  };
  if (filters.status) params.status = filters.status;
  if (filters.customerId) params.customerId = filters.customerId;
  if (filters.from) params.from = filters.from;
  if (filters.to) params.to = filters.to;
  if (filters.search) params.search = filters.search;

  const { data } = await api.get<BackendPaginated<Rental>>('/rentals', {
    params,
  });
  return normalizePaginated(data);
}

export async function getRental(id: string): Promise<Rental> {
  const { data } = await api.get<Rental>(`/rentals/${id}`);
  return data;
}

export async function createRental(payload: RentalPayload): Promise<Rental> {
  const { data } = await api.post<Rental>('/rentals', payload);
  return data;
}

export async function returnRental(id: string): Promise<Rental> {
  const { data } = await api.patch<Rental>(`/rentals/${id}/return`);
  return data;
}

export async function cancelRental(id: string): Promise<Rental> {
  const { data } = await api.patch<Rental>(`/rentals/${id}/cancel`);
  return data;
}

export async function deleteRental(id: string): Promise<void> {
  await api.delete(`/rentals/${id}`);
}
