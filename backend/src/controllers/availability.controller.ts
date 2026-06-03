import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../prisma';
import { AppError } from '../middleware/errorHandler';
import {
  checkProductAvailability,
  BLOCKING_RENTAL_STATUSES,
} from '../utils/availability';

type DayStatus = 'available' | 'reserved' | 'rented';

interface DayAvailability {
  date: string; // YYYY-MM-DD
  status: DayStatus;
}

/**
 * Formata uma data como YYYY-MM-DD em UTC (estavel, sem efeito de fuso).
 */
function toISODate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

const monthQuerySchema = z.object({
  year: z.coerce.number().int().min(2000).max(2100),
  month: z.coerce.number().int().min(1).max(12),
});

/**
 * GET /availability/products/:productId?year=YYYY&month=M
 * Retorna o status (available/reserved/rented) de cada dia do mes para o produto.
 *
 * Precedencia por dia: rented > reserved > available.
 */
export async function getProductAvailability(
  req: Request,
  res: Response,
): Promise<void> {
  const { productId } = req.params;
  const { year, month } = monthQuerySchema.parse(req.query);

  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { id: true },
  });
  if (!product) {
    throw new AppError(404, 'Produto nao encontrado.');
  }

  // Limites do mes em UTC. month e 1-based; Date.UTC usa 0-based.
  const monthStart = new Date(Date.UTC(year, month - 1, 1));
  const monthEnd = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999)); // ultimo dia
  const daysInMonth = monthEnd.getUTCDate();

  // Locacoes ativas que tocam o mes.
  const rentals = await prisma.rental.findMany({
    where: {
      productId,
      status: { in: BLOCKING_RENTAL_STATUSES },
      pickupDate: { lte: monthEnd },
      returnDate: { gte: monthStart },
    },
    select: { pickupDate: true, returnDate: true },
  });

  // Reservas nao canceladas dentro do mes.
  const reservations = await prisma.reservation.findMany({
    where: {
      productId,
      status: { in: ['PENDING', 'CONFIRMED'] },
      date: { gte: monthStart, lte: monthEnd },
    },
    select: { date: true },
  });

  const reservedDays = new Set<string>(
    reservations.map((r) => toISODate(r.date)),
  );

  const days: DayAvailability[] = [];

  for (let day = 1; day <= daysInMonth; day += 1) {
    const current = new Date(Date.UTC(year, month - 1, day));
    const iso = toISODate(current);

    // Rented tem precedencia maxima: dia cai em algum intervalo de locacao?
    const isRented = rentals.some(
      (r) => current >= startOfDay(r.pickupDate) && current <= endOfDay(r.returnDate),
    );

    let status: DayStatus = 'available';
    if (isRented) {
      status = 'rented';
    } else if (reservedDays.has(iso)) {
      status = 'reserved';
    }

    days.push({ date: iso, status });
  }

  res.json({
    productId,
    year,
    month,
    days,
  });
}

function startOfDay(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function endOfDay(d: Date): Date {
  return new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 23, 59, 59, 999),
  );
}

const checkQuerySchema = z.object({
  productId: z.string().min(1),
  pickupDate: z.coerce.date(),
  returnDate: z.coerce.date(),
  excludeRentalId: z.string().optional(),
});

/**
 * GET /availability/check?productId=&pickupDate=&returnDate=
 * Pre-validacao de UX: informa se o intervalo esta livre.
 * NAO substitui a verificacao transacional na criacao da locacao.
 */
export async function checkAvailability(req: Request, res: Response): Promise<void> {
  const { productId, pickupDate, returnDate, excludeRentalId } =
    checkQuerySchema.parse(req.query);

  if (returnDate < pickupDate) {
    throw new AppError(
      400,
      'Data de devolucao deve ser igual ou posterior a data de retirada.',
    );
  }

  const available = await checkProductAvailability(
    productId,
    pickupDate,
    returnDate,
    excludeRentalId,
  );

  res.json({ productId, available });
}
