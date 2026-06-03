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
 *
 * Considera conflito qualquer locacao em status bloqueante (ACTIVE/OVERDUE)
 * cujo intervalo [pickupDate, returnDate] sobreponha o intervalo solicitado.
 *
 * Regra de overlap (intervalos fechados):
 *   existeConflito = existing.pickupDate <= novo.returnDate
 *                 && existing.returnDate >= novo.pickupDate
 *
 * @param productId       Produto a verificar.
 * @param pickupDate      Data de retirada solicitada.
 * @param returnDate      Data de devolucao solicitada.
 * @param excludeRentalId Locacao a ignorar (usado em updates para nao colidir consigo mesma).
 * @param client          Cliente Prisma opcional (passe o tx dentro de uma transacao).
 * @returns true se disponivel, false se houver conflito.
 */
export async function checkProductAvailability(
  productId: string,
  pickupDate: Date,
  returnDate: Date,
  excludeRentalId?: string,
  client: Prisma.TransactionClient | typeof prisma = prisma,
): Promise<boolean> {
  if (returnDate < pickupDate) {
    // Intervalo invalido nunca pode estar "disponivel".
    return false;
  }

  const conflict = await client.rental.findFirst({
    where: {
      productId,
      status: { in: BLOCKING_RENTAL_STATUSES },
      ...(excludeRentalId ? { id: { not: excludeRentalId } } : {}),
      // Overlap: existente comeca antes (ou no dia) do fim solicitado
      // E existente termina depois (ou no dia) do inicio solicitado.
      AND: [
        { pickupDate: { lte: returnDate } },
        { returnDate: { gte: pickupDate } },
      ],
    },
    select: { id: true },
  });

  return conflict === null;
}

/**
 * Erro de dominio lancado quando ha conflito de datas. Capturado pelo errorHandler
 * e convertido em HTTP 409.
 */
export class AvailabilityConflictError extends Error {
  public readonly statusCode = 409;
  constructor(message = 'Produto indisponivel no periodo solicitado (conflito de datas).') {
    super(message);
    this.name = 'AvailabilityConflictError';
  }
}
