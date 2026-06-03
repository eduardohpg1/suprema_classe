import { api } from './client';
import {
  RentalByPeriodRow,
  TopProductRow,
  MonthlyRevenueRow,
  SearchResults,
} from '../types';

export async function getRentalsByPeriod(
  from: string,
  to: string
): Promise<RentalByPeriodRow[]> {
  const { data } = await api.get<RentalByPeriodRow[]>('/reports/rentals', {
    params: { from, to },
  });
  return data;
}

export async function getTopProducts(limit = 10): Promise<TopProductRow[]> {
  const { data } = await api.get<TopProductRow[]>('/reports/top-products', {
    params: { limit },
  });
  return data;
}

export async function getMonthlyRevenue(
  year?: number
): Promise<MonthlyRevenueRow[]> {
  const { data } = await api.get<MonthlyRevenueRow[]>(
    '/reports/monthly-revenue',
    { params: year ? { year } : {} }
  );
  return data;
}

export async function globalSearch(query: string): Promise<SearchResults> {
  const { data } = await api.get<SearchResults>('/search', {
    params: { q: query },
  });
  return data;
}
