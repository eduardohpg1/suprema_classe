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

function toISODate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function startOfDay(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function endOfDay(d: Date): Date {
  return new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 23, 59, 59, 999),
  );
}

const monthQuerySchema = z.object({
  year: z.coerce.number().int().min(2000).max(2100),
  month: z.coerce.number().int().min(1).max(12),
});

/**
 * GET /availability/products/:productId?year=YYYY&month=M
 * Retorna o status de cada dia do mes para o produto.
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

  const monthStart = new Date(Date.UTC(year, month - 1, 1));
  const monthEnd = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));
  const daysInMonth = monthEnd.getUTCDate();

  // Locacoes ativas que envolvem este produto e tocam o mes
  const rentalItems = await prisma.rentalItem.findMany({
    where: {
      productId,
      rental: {
        status: { in: BLOCKING_RENTAL_STATUSES },
        pickupDate: { lte: monthEnd },
        returnDate: { gte: monthStart },
      },
    },
    include: {
      rental: { select: { pickupDate: true, returnDate: true } },
    },
  });

  const reservations = await prisma.reservation.findMany({
    where: {
      productId,
      status: { in: ['PENDING', 'CONFIRMED'] },
      date: { gte: monthStart, lte: monthEnd },
    },
    select: { date: true },
  });

  const reservedDays = new Set<string>(reservations.map((r) => toISODate(r.date)));

  const days: DayAvailability[] = [];

  for (let day = 1; day <= daysInMonth; day += 1) {
    const current = new Date(Date.UTC(year, month - 1, day));
    const iso = toISODate(current);

    const isRented = rentalItems.some(
      (ri) =>
        current >= startOfDay(ri.rental.pickupDate) &&
        current <= endOfDay(ri.rental.returnDate),
    );

    let status: DayStatus = 'available';
    if (isRented) {
      status = 'rented';
    } else if (reservedDays.has(iso)) {
      status = 'reserved';
    }

    days.push({ date: iso, status });
  }

  res.json({ productId, year, month, days });
}

const checkQuerySchema = z.object({
  productId: z.string().min(1),
  pickupDate: z.coerce.date(),
  returnDate: z.coerce.date(),
  excludeRentalId: z.string().optional(),
});

/**
 * GET /availability/check?productId=&pickupDate=&returnDate=
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
