import { ProductStatus, RentalStatus } from '../types';

export const productStatusConfig: Record<
  ProductStatus,
  { label: string; variant: 'green' | 'yellow' | 'red' | 'gray' }
> = {
  AVAILABLE: { label: 'Disponível', variant: 'green' },
  RESERVED: { label: 'Reservado', variant: 'yellow' },
  RENTED: { label: 'Alugado', variant: 'red' },
  MAINTENANCE: { label: 'Manutenção', variant: 'gray' },
};

export const rentalStatusConfig: Record<
  RentalStatus,
  { label: string; variant: 'green' | 'yellow' | 'red' | 'gray' | 'pink' }
> = {
  ACTIVE: { label: 'Ativa', variant: 'pink' },
  RETURNED: { label: 'Devolvida', variant: 'green' },
  OVERDUE: { label: 'Atrasada', variant: 'red' },
  CANCELLED: { label: 'Cancelada', variant: 'gray' },
};
