import { Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../prisma';
import { AppError } from '../middleware/errorHandler';
import { getPagination, buildPaginatedResult } from '../utils/pagination';
import {
  checkProductAvailability,
  AvailabilityConflictError,
  BLOCKING_RENTAL_STATUSES,
} from '../utils/availability';

const RENTAL_STATUSES = ['ACTIVE', 'RETURNED', 'OVERDUE', 'CANCELLED'] as const;

const dateSchema = z.coerce.date();

const createRentalSchema = z
  .object({
    productId: z.string().min(1, 'Produto obrigatorio.'),
    customerId: z.string().min(1, 'Cliente obrigatorio.'),
    pickupDate: dateSchema,
    returnDate: dateSchema,
    totalValue: z.coerce.number().nonnegative('Valor total invalido.'),
    depositValue: z.coerce.number().nonnegative('Valor de sinal invalido.').default(0),
    remainingValue: z.coerce.number().nonnegative('Valor restante invalido.').optional(),
    notes: z.string().max(1000).optional().nullable(),
  })
  .refine((d) => d.returnDate >= d.pickupDate, {
    message: 'Data de devolucao deve ser igual ou posterior a data de retirada.',
    path: ['returnDate'],
  });

const updateRentalSchema = z
  .object({
    pickupDate: dateSchema.optional(),
    returnDate: dateSchema.optional(),
    totalValue: z.coerce.number().nonnegative().optional(),
    depositValue: z.coerce.number().nonnegative().optional(),
    remainingValue: z.coerce.number().nonnegative().optional(),
    notes: z.string().max(1000).optional().nullable(),
    status: z.enum(RENTAL_STATUSES).optional(),
  })
  .refine(
    (d) =>
      !d.pickupDate || !d.returnDate || d.returnDate >= d.pickupDate,
    {
      message: 'Data de devolucao deve ser igual ou posterior a data de retirada.',
      path: ['returnDate'],
    },
  );

const rentalInclude = {
  product: {
    select: { id: true, code: true, name: true, size: true, color: true, status: true },
  },
  customer: {
    select: { id: true, name: true, cpf: true, rg: true, phone: true, address: true },
  },
  contract: true,
} satisfies Prisma.RentalInclude;

/**
 * GET /rentals
 * Filtros: status, customerId, productId, from, to (intervalo sobre pickupDate).
 */
export async function listRentals(req: Request, res: Response): Promise<void> {
  const pagination = getPagination(req);
  const { status, customerId, productId, from, to } = req.query;

  const where: Prisma.RentalWhereInput = {};

  if (typeof status === 'string' && (RENTAL_STATUSES as readonly string[]).includes(status)) {
    where.status = status as Prisma.RentalWhereInput['status'];
  }
  if (typeof customerId === 'string' && customerId) where.customerId = customerId;
  if (typeof productId === 'string' && productId) where.productId = productId;

  if (typeof from === 'string' && from) {
    where.pickupDate = { ...(where.pickupDate as object), gte: new Date(from) };
  }
  if (typeof to === 'string' && to) {
    where.pickupDate = { ...(where.pickupDate as object), lte: new Date(to) };
  }

  const [rentals, total] = await Promise.all([
    prisma.rental.findMany({
      where,
      include: rentalInclude,
      orderBy: { pickupDate: 'desc' },
      skip: pagination.skip,
      take: pagination.take,
    }),
    prisma.rental.count({ where }),
  ]);

  res.json(buildPaginatedResult(rentals, total, pagination));
}

/**
 * GET /rentals/:id
 */
export async function getRental(req: Request, res: Response): Promise<void> {
  const rental = await prisma.rental.findUnique({
    where: { id: req.params.id },
    include: rentalInclude,
  });

  if (!rental) {
    throw new AppError(404, 'Locacao nao encontrada.');
  }

  res.json(rental);
}

/**
 * POST /rentals
 * CRITICO: verifica conflito de datas dentro de uma transacao Serializable
 * (previne double-booking em concorrencia) e atualiza o status do produto.
 */
export async function createRental(req: Request, res: Response): Promise<void> {
  const data = createRentalSchema.parse(req.body);

  const remainingValue =
    data.remainingValue ?? Math.max(0, data.totalValue - data.depositValue);

  const rental = await prisma.$transaction(
    async (tx) => {
      // Valida existencia de produto e cliente.
      const product = await tx.product.findUnique({
        where: { id: data.productId },
        select: { id: true, status: true },
      });
      if (!product) {
        throw new AppError(400, 'Produto informado nao existe.');
      }
      if (product.status === 'MAINTENANCE') {
        throw new AppError(409, 'Produto esta em manutencao e nao pode ser locado.');
      }

      const customer = await tx.customer.findUnique({
        where: { id: data.customerId },
        select: { id: true },
      });
      if (!customer) {
        throw new AppError(400, 'Cliente informado nao existe.');
      }

      // Verificacao de conflito DENTRO da transacao (fonte da verdade).
      const available = await checkProductAvailability(
        data.productId,
        data.pickupDate,
        data.returnDate,
        undefined,
        tx,
      );
      if (!available) {
        throw new AvailabilityConflictError();
      }

      const created = await tx.rental.create({
        data: {
          productId: data.productId,
          customerId: data.customerId,
          pickupDate: data.pickupDate,
          returnDate: data.returnDate,
          totalValue: new Prisma.Decimal(data.totalValue),
          depositValue: new Prisma.Decimal(data.depositValue),
          remainingValue: new Prisma.Decimal(remainingValue),
          notes: data.notes ?? null,
          status: 'ACTIVE',
        },
        include: rentalInclude,
      });

      // Marca o produto como RENTED.
      await tx.product.update({
        where: { id: data.productId },
        data: { status: 'RENTED' },
      });

      return created;
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );

  res.status(201).json(rental);
}

/**
 * PUT /rentals/:id
 * Permite atualizar datas/valores/notas. Se datas mudarem, revalida conflito.
 */
export async function updateRental(req: Request, res: Response): Promise<void> {
  const data = updateRentalSchema.parse(req.body);
  const rentalId = req.params.id;

  const rental = await prisma.$transaction(
    async (tx) => {
      const existing = await tx.rental.findUnique({ where: { id: rentalId } });
      if (!existing) {
        throw new AppError(404, 'Locacao nao encontrada.');
      }

      const newPickup = data.pickupDate ?? existing.pickupDate;
      const newReturn = data.returnDate ?? existing.returnDate;

      // Revalida conflito apenas se datas mudaram e a locacao continua bloqueante.
      const datesChanged =
        data.pickupDate !== undefined || data.returnDate !== undefined;
      const targetStatus = data.status ?? existing.status;
      const stillBlocking = BLOCKING_RENTAL_STATUSES.includes(targetStatus);

      if (datesChanged && stillBlocking) {
        const available = await checkProductAvailability(
          existing.productId,
          newPickup,
          newReturn,
          rentalId,
          tx,
        );
        if (!available) {
          throw new AvailabilityConflictError();
        }
      }

      const updateData: Prisma.RentalUpdateInput = {};
      if (data.pickupDate !== undefined) updateData.pickupDate = data.pickupDate;
      if (data.returnDate !== undefined) updateData.returnDate = data.returnDate;
      if (data.totalValue !== undefined) {
        updateData.totalValue = new Prisma.Decimal(data.totalValue);
      }
      if (data.depositValue !== undefined) {
        updateData.depositValue = new Prisma.Decimal(data.depositValue);
      }
      if (data.remainingValue !== undefined) {
        updateData.remainingValue = new Prisma.Decimal(data.remainingValue);
      }
      if (data.notes !== undefined) updateData.notes = data.notes;
      if (data.status !== undefined) updateData.status = data.status;

      const updated = await tx.rental.update({
        where: { id: rentalId },
        data: updateData,
        include: rentalInclude,
      });

      // Se o status mudou, sincroniza o estado do produto.
      if (data.status !== undefined && data.status !== existing.status) {
        if (data.status === 'RETURNED' || data.status === 'CANCELLED') {
          // Locacao saiu de ativa: libera produto se nao houver outra ativa.
          const otherActive = await tx.rental.count({
            where: {
              productId: existing.productId,
              status: { in: BLOCKING_RENTAL_STATUSES },
              id: { not: rentalId },
            },
          });
          if (otherActive === 0) {
            await tx.product.update({
              where: { id: existing.productId },
              data: { status: 'AVAILABLE' },
            });
          }
        } else if (BLOCKING_RENTAL_STATUSES.includes(data.status)) {
          // Locacao voltou a ativa: marca produto como RENTED.
          await tx.product.update({
            where: { id: existing.productId },
            data: { status: 'RENTED' },
          });
        }
      }

      return updated;
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );

  res.json(rental);
}

/**
 * POST /rentals/:id/return
 * Marca a locacao como devolvida e libera o produto (AVAILABLE).
 */
export async function returnRental(req: Request, res: Response): Promise<void> {
  const rentalId = req.params.id;

  const rental = await prisma.$transaction(async (tx) => {
    const existing = await tx.rental.findUnique({ where: { id: rentalId } });
    if (!existing) {
      throw new AppError(404, 'Locacao nao encontrada.');
    }
    if (existing.status === 'RETURNED') {
      throw new AppError(409, 'Esta locacao ja foi devolvida.');
    }
    if (existing.status === 'CANCELLED') {
      throw new AppError(409, 'Locacao cancelada nao pode ser devolvida.');
    }

    const updated = await tx.rental.update({
      where: { id: rentalId },
      data: { status: 'RETURNED' },
      include: rentalInclude,
    });

    // Libera o produto somente se nao houver outra locacao ativa para ele.
    const otherActive = await tx.rental.count({
      where: {
        productId: existing.productId,
        status: { in: BLOCKING_RENTAL_STATUSES },
        id: { not: rentalId },
      },
    });
    if (otherActive === 0) {
      await tx.product.update({
        where: { id: existing.productId },
        data: { status: 'AVAILABLE' },
      });
    }

    return updated;
  });

  res.json(rental);
}

/**
 * POST /rentals/:id/cancel
 * Cancela a locacao e libera o produto se nao houver outra ativa.
 */
export async function cancelRental(req: Request, res: Response): Promise<void> {
  const rentalId = req.params.id;

  const rental = await prisma.$transaction(async (tx) => {
    const existing = await tx.rental.findUnique({ where: { id: rentalId } });
    if (!existing) {
      throw new AppError(404, 'Locacao nao encontrada.');
    }
    if (existing.status === 'CANCELLED') {
      throw new AppError(409, 'Esta locacao ja esta cancelada.');
    }
    if (existing.status === 'RETURNED') {
      throw new AppError(409, 'Locacao ja devolvida nao pode ser cancelada.');
    }

    const updated = await tx.rental.update({
      where: { id: rentalId },
      data: { status: 'CANCELLED' },
      include: rentalInclude,
    });

    const otherActive = await tx.rental.count({
      where: {
        productId: existing.productId,
        status: { in: BLOCKING_RENTAL_STATUSES },
        id: { not: rentalId },
      },
    });
    if (otherActive === 0) {
      await tx.product.update({
        where: { id: existing.productId },
        data: { status: 'AVAILABLE' },
      });
    }

    return updated;
  });

  res.json(rental);
}
