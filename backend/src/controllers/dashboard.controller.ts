import { Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { prisma } from '../prisma';
import { BLOCKING_RENTAL_STATUSES } from '../utils/availability';

// Fuso horario da aplicacao. As datas de retirada/devolucao sao "date-only"
// gravadas como meia-noite UTC; usamos o dia no fuso local (Brasilia) para que
// "hoje"/"mes atual" reflitam o calendario do usuario, e nao o do servidor (UTC).
const APP_TIMEZONE = 'America/Sao_Paulo';

/**
 * Retorna {year, month, day} do dia atual no fuso da aplicacao (Brasilia).
 * month e 1-based.
 */
function localTodayParts(): { year: number; month: number; day: number } {
  const formatted = new Intl.DateTimeFormat('en-CA', {
    timeZone: APP_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
  const [year, month, day] = formatted.split('-').map(Number);
  return { year, month, day };
}

/**
 * Inicio e fim do dia atual (no fuso local) expressos em UTC, casando com as
 * datas date-only gravadas a meia-noite UTC.
 */
function todayRange(): { start: Date; end: Date } {
  const { year, month, day } = localTodayParts();
  const start = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
  const end = new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999));
  return { start, end };
}

/**
 * Inicio e fim do mes corrente (no fuso local) expressos em UTC.
 */
function currentMonthRange(): { start: Date; end: Date } {
  const { year, month } = localTodayParts();
  const start = new Date(Date.UTC(year, month - 1, 1));
  const end = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));
  return { start, end };
}

/**
 * GET /dashboard
 * Indicadores: produtos por status, faturamento do mes, retiradas/devolucoes de hoje.
 */
export async function getDashboard(_req: Request, res: Response): Promise<void> {
  const { start: dayStart, end: dayEnd } = todayRange();
  const { start: monthStart, end: monthEnd } = currentMonthRange();

  const [
    totalAvailable,
    totalRented,
    totalReserved,
    totalMaintenance,
    revenueAgg,
    pickupToday,
    returnToday,
    activeRentals,
    overdueRentals,
    totalCustomers,
    totalProducts,
  ] = await Promise.all([
    prisma.product.count({ where: { status: 'AVAILABLE' } }),
    prisma.product.count({ where: { status: 'RENTED' } }),
    prisma.product.count({ where: { status: 'RESERVED' } }),
    prisma.product.count({ where: { status: 'MAINTENANCE' } }),
    // Faturamento: soma de totalValue das locacoes com retirada no mes (exceto canceladas).
    prisma.rental.aggregate({
      _sum: { totalValue: true },
      where: {
        pickupDate: { gte: monthStart, lte: monthEnd },
        status: { not: 'CANCELLED' },
      },
    }),
    prisma.rental.findMany({
      where: {
        pickupDate: { gte: dayStart, lte: dayEnd },
        status: { not: 'CANCELLED' },
      },
      include: {
        product: { select: { id: true, code: true, name: true } },
        customer: { select: { id: true, name: true, phone: true } },
      },
      orderBy: { pickupDate: 'asc' },
    }),
    prisma.rental.findMany({
      where: {
        returnDate: { gte: dayStart, lte: dayEnd },
        status: { in: BLOCKING_RENTAL_STATUSES },
      },
      include: {
        product: { select: { id: true, code: true, name: true } },
        customer: { select: { id: true, name: true, phone: true } },
      },
      orderBy: { returnDate: 'asc' },
    }),
    prisma.rental.count({ where: { status: 'ACTIVE' } }),
    prisma.rental.count({ where: { status: 'OVERDUE' } }),
    prisma.customer.count(),
    prisma.product.count(),
  ]);

  const monthlyRevenue = (revenueAgg._sum.totalValue ?? new Prisma.Decimal(0)).toFixed(2);

  res.json({
    products: {
      total: totalProducts,
      available: totalAvailable,
      rented: totalRented,
      reserved: totalReserved,
      maintenance: totalMaintenance,
    },
    totalAvailable,
    totalRented,
    totalReserved,
    monthlyRevenue,
    rentals: {
      active: activeRentals,
      overdue: overdueRentals,
    },
    totalCustomers,
    pickupToday,
    returnToday,
  });
}
