import { Prisma, RentalStatus } from '@prisma/client';
import { prisma } from '../prisma';

/**
 * Status que bloqueiam um produto para novas locacoes (locacao em andamento).
 * RETURNED e CANCELLED nao bloqueiam pois o produto ja esta livre.
 */
export const BLOCKING_RENTAL_STATUSES: RentalStatus[] = [
  RentalStatus.ACTIVE,
  RentalStatus.OVERDUE,
];

/**
 * Verifica se um produto esta disponivel para locacao no intervalo informado.
 * Usa RentalItem para verificar conflitos (suporte a multiplos produtos por locacao).
 */
export async function checkProductAvailability(
  productId: string,
  pickupDate: Date,
  returnDate: Date,
  excludeRentalId?: string,
  client: Prisma.TransactionClient | typeof prisma = prisma,
): Promise<boolean> {
  if (returnDate < pickupDate) {
    return false;
  }

  const conflict = await client.rentalItem.findFirst({
    where: {
      productId,
      rental: {
        status: { in: BLOCKING_RENTAL_STATUSES },
        ...(excludeRentalId ? { id: { not: excludeRentalId } } : {}),
        AND: [
          { pickupDate: { lte: returnDate } },
          { returnDate: { gte: pickupDate } },
        ],
      },
    },
    select: { id: true },
  });

  return conflict === null;
}

/**
 * Erro de dominio lancado quando ha conflito de datas.
 */
export class AvailabilityConflictError extends Error {
  public readonly statusCode = 409;
  constructor(message = 'Produto indisponivel no periodo solicitado (conflito de datas).') {
    super(message);
    this.name = 'AvailabilityConflictError';
  }
}
