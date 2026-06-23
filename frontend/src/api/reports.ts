import { api } from './client';
import {
  RentalByPeriodRow,
  TopProductRow,
  MonthlyRevenueRow,
  SearchResults,
} from '../types';

const MONTHS_PT = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

export async function getRentalsByPeriod(
  from: string,
  to: string
): Promise<RentalByPeriodRow[]> {
  const { data } = await api.get<{ rentals: any[] }>('/reports/rentals', {
    params: { startDate: from, endDate: to },
  });
  return (data.rentals ?? []).map((r: any) => ({
    id: r.id,
    product: r.items?.[0]?.product?.name ?? '-',
    customer: r.customer?.name ?? '-',
    pickupDate: r.pickupDate,
    returnDate: r.returnDate,
    totalValue: r.totalValue,
    status: r.status,
  }));
}

export async function getTopProducts(limit = 10): Promise<TopProductRow[]> {
  const { data } = await api.get<{ products: any[] }>('/reports/most-rented', {
    params: { limit },
  });
  return (data.products ?? []).map((p: any) => ({
    productId: p.product?.id ?? '',
    code: p.product?.code ?? '',
    name: p.product?.name ?? '-',
    rentalsCount: p.rentalCount ?? 0,
    totalRevenue: Number(p.totalRevenue ?? 0),
  }));
}

export async function getMonthlyRevenue(
  year?: number
): Promise<MonthlyRevenueRow[]> {
  const currentYear = year ?? new Date().getFullYear();
  const { data } = await api.get<{ months: any[] }>(
    '/reports/monthly-revenue',
    { params: { year: currentYear } }
  );
  return (data.months ?? []).map((m: any) => ({
    month: `${currentYear}-${String(m.month).padStart(2, '0')}`,
    label: `${MONTHS_PT[m.month - 1]}/${currentYear}`,
    rentalsCount: m.count ?? 0,
    revenue: Number(m.revenue ?? 0),
  }));
}

export async function globalSearch(query: string): Promise<SearchResults> {
  const { data } = await api.get<SearchResults>('/search', {
    params: { q: query },
  });
  return data;
}
