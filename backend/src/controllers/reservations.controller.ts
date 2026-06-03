import { Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../prisma';
import { AppError } from '../middleware/errorHandler';
import { getPagination, buildPaginatedResult } from '../utils/pagination';

const RESERVATION_STATUSES = ['PENDING', 'CONFIRMED', 'CANCELLED'] as const;

const createReservationSchema = z.object({
  productId: z.string().min(1, 'Produto obrigatorio.'),
  customerId: z.string().min(1, 'Cliente obrigatorio.'),
  date: z.coerce.date(),
  notes: z.string().max(1000).optional().nullable(),
  status: z.enum(RESERVATION_STATUSES).optional(),
});

const updateReservationSchema = z.object({
  date: z.coerce.date().optional(),
  notes: z.string().max(1000).optional().nullable(),
  status: z.enum(RESERVATION_STATUSES).optional(),
});

const reservationInclude = {
  product: { select: { id: true, code: true, name: true, status: true } },
  customer: { select: { id: true, name: true, phone: true } },
} satisfies Prisma.ReservationInclude;

/**
 * GET /reservations
 * Filtros: status, productId, customerId, from, to (sobre date).
 */
export async function listReservations(req: Request, res: Response): Promise<void> {
  const pagination = getPagination(req);
  const { status, productId, customerId, from, to } = req.query;

  const where: Prisma.ReservationWhereInput = {};

  if (
    typeof status === 'string' &&
    (RESERVATION_STATUSES as readonly string[]).includes(status)
  ) {
    where.status = status as Prisma.ReservationWhereInput['status'];
  }
  if (typeof productId === 'string' && productId) where.productId = productId;
  if (typeof customerId === 'string' && customerId) where.customerId = customerId;

  if (typeof from === 'string' && from) {
    where.date = { ...(where.date as object), gte: new Date(from) };
  }
  if (typeof to === 'string' && to) {
    where.date = { ...(where.date as object), lte: new Date(to) };
  }

  const [reservations, total] = await Promise.all([
    prisma.reservation.findMany({
      where,
      include: reservationInclude,
      orderBy: { date: 'desc' },
      skip: pagination.skip,
      take: pagination.take,
    }),
    prisma.reservation.count({ where }),
  ]);

  res.json(buildPaginatedResult(reservations, total, pagination));
}

/**
 * GET /reservations/:id
 */
export async function getReservation(req: Request, res: Response): Promise<void> {
  const reservation = await prisma.reservation.findUnique({
    where: { id: req.params.id },
    include: reservationInclude,
  });

  if (!reservation) {
    throw new AppError(404, 'Reserva nao encontrada.');
  }

  res.json(reservation);
}

/**
 * POST /reservations
 */
export async function createReservation(req: Request, res: Response): Promise<void> {
  const data = createReservationSchema.parse(req.body);

  const [product, customer] = await Promise.all([
    prisma.product.findUnique({ where: { id: data.productId }, select: { id: true } }),
    prisma.customer.findUnique({ where: { id: data.customerId }, select: { id: true } }),
  ]);

  if (!product) throw new AppError(400, 'Produto informado nao existe.');
  if (!customer) throw new AppError(400, 'Cliente informado nao existe.');

  const reservation = await prisma.reservation.create({
    data: {
      productId: data.productId,
      customerId: data.customerId,
      date: data.date,
      notes: data.notes ?? null,
      status: data.status ?? 'PENDING',
    },
    include: reservationInclude,
  });

  res.status(201).json(reservation);
}

/**
 * PUT /reservations/:id
 */
export async function updateReservation(req: Request, res: Response): Promise<void> {
  const data = updateReservationSchema.parse(req.body);

  const updateData: Prisma.ReservationUpdateInput = {};
  if (data.date !== undefined) updateData.date = data.date;
  if (data.notes !== undefined) updateData.notes = data.notes;
  if (data.status !== undefined) updateData.status = data.status;

  const reservation = await prisma.reservation.update({
    where: { id: req.params.id },
    data: updateData,
    include: reservationInclude,
  });

  res.json(reservation);
}

/**
 * POST /reservations/:id/cancel
 */
export async function cancelReservation(req: Request, res: Response): Promise<void> {
  const reservation = await prisma.reservation.update({
    where: { id: req.params.id },
    data: { status: 'CANCELLED' },
    include: reservationInclude,
  });

  res.json(reservation);
}

/**
 * DELETE /reservations/:id
 */
export async function deleteReservation(req: Request, res: Response): Promise<void> {
  await prisma.reservation.delete({ where: { id: req.params.id } });
  res.status(204).send();
}
