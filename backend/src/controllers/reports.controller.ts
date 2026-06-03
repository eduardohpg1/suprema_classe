import { Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../prisma';
import { AppError } from '../middleware/errorHandler';

const periodSchema = z.object({
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
});

/**
 * GET /reports/rentals?startDate=&endDate=
 * Locacoes (nao canceladas) com retirada dentro do periodo + total faturado.
 */
export async function rentalsByPeriod(req: Request, res: Response): Promise<void> {
  const { startDate, endDate } = periodSchema.parse(req.query);

  if (endDate < startDate) {
    throw new AppError(400, 'endDate deve ser posterior a startDate.');
  }

  const rentals = await prisma.rental.findMany({
    where: {
      pickupDate: { gte: startDate, lte: endDate },
      status: { not: 'CANCELLED' },
    },
    include: {
      product: { select: { id: true, code: true, name: true } },
      customer: { select: { id: true, name: true } },
    },
    orderBy: { pickupDate: 'asc' },
  });

  const totalRevenue = rentals.reduce(
    (acc, r) => acc.add(r.totalValue),
    new Prisma.Decimal(0),
  );

  res.json({
    startDate,
    endDate,
    count: rentals.length,
    totalRevenue: totalRevenue.toFixed(2),
    rentals,
  });
}

const limitSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(10),
});

/**
 * GET /reports/most-rented?limit=10
 * Produtos mais locados (conta locacoes nao canceladas).
 */
export async function mostRentedProducts(req: Request, res: Response): Promise<void> {
  const { limit } = limitSchema.parse(req.query);

  const grouped = await prisma.rental.groupBy({
    by: ['productId'],
    where: { status: { not: 'CANCELLED' } },
    _count: { productId: true },
    _sum: { totalValue: true },
    orderBy: { _count: { productId: 'desc' } },
    take: limit,
  });

  const productIds = grouped.map((g) => g.productId);
  const products = await prisma.product.findMany({
    where: { id: { in: productIds } },
    select: { id: true, code: true, name: true, status: true },
  });
  const productMap = new Map(products.map((p) => [p.id, p]));

  const result = grouped.map((g) => ({
    product: productMap.get(g.productId) ?? null,
    rentalCount: g._count.productId,
    totalRevenue: (g._sum.totalValue ?? new Prisma.Decimal(0)).toFixed(2),
  }));

  res.json({ limit, products: result });
}

const yearSchema = z.object({
  year: z.coerce.number().int().min(2000).max(2100),
});

/**
 * GET /reports/monthly-revenue?year=YYYY
 * Faturamento por mes do ano (12 entradas), baseado na data de retirada.
 */
export async function monthlyRevenue(req: Request, res: Response): Promise<void> {
  const { year } = yearSchema.parse(req.query);

  const yearStart = new Date(Date.UTC(year, 0, 1));
  const yearEnd = new Date(Date.UTC(year, 11, 31, 23, 59, 59, 999));

  const rentals = await prisma.rental.findMany({
    where: {
      pickupDate: { gte: yearStart, lte: yearEnd },
      status: { not: 'CANCELLED' },
    },
    select: { pickupDate: true, totalValue: true },
  });

  // Inicializa 12 meses zerados.
  const months = Array.from({ length: 12 }, (_, i) => ({
    month: i + 1,
    revenue: new Prisma.Decimal(0),
    count: 0,
  }));

  rentals.forEach((r) => {
    const m = r.pickupDate.getUTCMonth(); // 0-based
    months[m].revenue = months[m].revenue.add(r.totalValue);
    months[m].count += 1;
  });

  const total = months.reduce((acc, m) => acc.add(m.revenue), new Prisma.Decimal(0));

  res.json({
    year,
    total: total.toFixed(2),
    months: months.map((m) => ({
      month: m.month,
      revenue: m.revenue.toFixed(2),
      count: m.count,
    })),
  });
}

/**
 * GET /reports/recurring-customers
 * Clientes com mais de uma locacao (nao cancelada), ordenados por contagem.
 */
export async function recurringCustomers(_req: Request, res: Response): Promise<void> {
  const grouped = await prisma.rental.groupBy({
    by: ['customerId'],
    where: { status: { not: 'CANCELLED' } },
    _count: { customerId: true },
    _sum: { totalValue: true },
    having: { customerId: { _count: { gt: 1 } } },
    orderBy: { _count: { customerId: 'desc' } },
  });

  const customerIds = grouped.map((g) => g.customerId);
  const customers = await prisma.customer.findMany({
    where: { id: { in: customerIds } },
    select: { id: true, name: true, phone: true, cpf: true },
  });
  const customerMap = new Map(customers.map((c) => [c.id, c]));

  const result = grouped.map((g) => ({
    customer: customerMap.get(g.customerId) ?? null,
    rentalCount: g._count.customerId,
    totalSpent: (g._sum.totalValue ?? new Prisma.Decimal(0)).toFixed(2),
  }));

  res.json({ count: result.length, customers: result });
}

/**
 * GET /reports/available-products
 * Lista produtos atualmente disponiveis.
 */
export async function availableProducts(_req: Request, res: Response): Promise<void> {
  const products = await prisma.product.findMany({
    where: { status: 'AVAILABLE' },
    orderBy: { name: 'asc' },
    include: {
      category: { select: { id: true, name: true } },
      photos: {
        where: { isPrimary: true },
        take: 1,
        select: { url: true },
      },
    },
  });

  res.json({ count: products.length, products });
}
