import { api } from './client';
import { AvailabilityDay } from '../types';

/**
 * Busca a disponibilidade de um produto em um mês específico.
 * year: ano completo (ex: 2026). month: 1-12.
 */
export async function getProductAvailability(
  productId: string,
  year: number,
  month: number
): Promise<AvailabilityDay[]> {
  const { data } = await api.get<{ days: AvailabilityDay[] }>(
    `/availability/products/${productId}`,
    { params: { year, month } }
  );
  return data.days;
}

/**
 * Verifica se um intervalo está disponível (pré-validação de UX).
 * O backend faz a checagem definitiva dentro de uma transação.
 */
export async function checkAvailability(
  productId: string,
  pickupDate: string,
  returnDate: string,
  excludeRentalId?: string
): Promise<{ available: boolean }> {
  const { data } = await api.get<{ available: boolean }>(
    `/availability/check`,
    { params: { productId, pickupDate, returnDate, excludeRentalId } }
  );
  return data;
}
