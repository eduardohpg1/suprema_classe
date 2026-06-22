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

const rentalItemSchema = z.object({
  productId: z.string().min(1),
  quantity: z.coerce.number().int().positive().default(1),
});

const createRentalSchema = z
  .object({
    items: z.array(rentalItemSchema).min(1, 'Adicione ao menos um produto.'),
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
    (d) => !d.pickupDate || !d.returnDate || d.returnDate >= d.pickupDate,
    {
      message: 'Data de devolucao deve ser igual ou posterior a data de retirada.',
      path: ['returnDate'],
    },
  );

const rentalInclude = {
  customer: {
    select: { id: true, name: true, cpf: true, rg: true, phone: true, address: true },
  },
  items: {
    include: {
      product: {
        select: { id: true, code: true, name: true, size: true, color: true, status: true, rentalPrice: true },
      },
    },
    orderBy: { product: { name: 'asc' } },
  },
  contract: true,
} satisfies Prisma.RentalInclude;

/**
 * GET /rentals
 */
export async function listRentals(req: Request, res: Response): Promise<void> {
  const pagination = getPagination(req);
  const { status, customerId, productId, from, to } = req.query;

  const where: Prisma.RentalWhereInput = {};

  if (typeof status === 'string' && (RENTAL_STATUSES as readonly string[]).includes(status)) {
    where.status = status as Prisma.RentalWhereInput['status'];
  }
  if (typeof customerId === 'string' && customerId) where.customerId = customerId;
  if (typeof productId === 'string' && productId) {
    where.items = { some: { productId } };
  }

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

  if (!rental) throw new AppError(404, 'Locacao nao encontrada.');

  res.json(rental);
}

/**
 * POST /rentals
 */
export async function createRental(req: Request, res: Response): Promise<void> {
  const data = createRentalSchema.parse(req.body);

  const remainingValue =
    data.remainingValue ?? Math.max(0, data.totalValue - data.depositValue);

  const rental = await prisma.$transaction(
    async (tx) => {
      // Valida cliente
      const customer = await tx.customer.findUnique({ where: { id: data.customerId }, select: { id: true } });
      if (!customer) throw new AppError(400, 'Cliente informado nao existe.');

      // Valida cada produto e verifica disponibilidade
      for (const item of data.items) {
        const product = await tx.product.findUnique({
          where: { id: item.productId },
          select: { id: true, status: true, rentalPrice: true },
        });
        if (!product) throw new AppError(400, `Produto ${item.productId} nao existe.`);
        if (product.status === 'MAINTENANCE') {
          throw new AppError(409, 'Um dos produtos esta em manutencao.');
        }

        const available = await checkProductAvailability(
          item.productId,
          data.pickupDate,
          data.returnDate,
          undefined,
          tx,
        );
        if (!available) throw new AvailabilityConflictError();
      }

      // Busca preços atuais dos produtos
      const productIds = data.items.map((i) => i.productId);
      const products = await tx.product.findMany({
        where: { id: { in: productIds } },
        select: { id: true, rentalPrice: true },
      });
      const priceMap = Object.fromEntries(products.map((p) => [p.id, p.rentalPrice]));

      const created = await tx.rental.create({
        data: {
          customerId: data.customerId,
          pickupDate: data.pickupDate,
          returnDate: data.returnDate,
          totalValue: new Prisma.Decimal(data.totalValue),
          depositValue: new Prisma.Decimal(data.depositValue),
          remainingValue: new Prisma.Decimal(remainingValue),
          notes: data.notes ?? null,
          status: 'ACTIVE',
          items: {
            create: data.items.map((item) => ({
              productId: item.productId,
              unitPrice: priceMap[item.productId] ?? new Prisma.Decimal(0),
              quantity: item.quantity,
            })),
          },
        },
        include: rentalInclude,
      });

      // Marca todos os produtos como RENTED
      await tx.product.updateMany({
        where: { id: { in: productIds } },
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
 */
export async function updateRental(req: Request, res: Response): Promise<void> {
  const data = updateRentalSchema.parse(req.body);
  const rentalId = req.params.id;

  const rental = await prisma.$transaction(
    async (tx) => {
      const existing = await tx.rental.findUnique({
        where: { id: rentalId },
        include: { items: { select: { productId: true } } },
      });
      if (!existing) throw new AppError(404, 'Locacao nao encontrada.');

      const newPickup = data.pickupDate ?? existing.pickupDate;
      const newReturn = data.returnDate ?? existing.returnDate;
      const datesChanged = data.pickupDate !== undefined || data.returnDate !== undefined;
      const targetStatus = data.status ?? existing.status;
      const stillBlocking = BLOCKING_RENTAL_STATUSES.includes(targetStatus);

      if (datesChanged && stillBlocking) {
        for (const item of existing.items) {
          const available = await checkProductAvailability(
            item.productId,
            newPickup,
            newReturn,
            rentalId,
            tx,
          );
          if (!available) throw new AvailabilityConflictError();
        }
      }

      const updateData: Prisma.RentalUpdateInput = {};
      if (data.pickupDate !== undefined) updateData.pickupDate = data.pickupDate;
      if (data.returnDate !== undefined) updateData.returnDate = data.returnDate;
      if (data.totalValue !== undefined) updateData.totalValue = new Prisma.Decimal(data.totalValue);
      if (data.depositValue !== undefined) updateData.depositValue = new Prisma.Decimal(data.depositValue);
      if (data.remainingValue !== undefined) updateData.remainingValue = new Prisma.Decimal(data.remainingValue);
      if (data.notes !== undefined) updateData.notes = data.notes;
      if (data.status !== undefined) updateData.status = data.status;

      const updated = await tx.rental.update({
        where: { id: rentalId },
        data: updateData,
        include: rentalInclude,
      });

      // Sincroniza status dos produtos se status mudou
      if (data.status !== undefined && data.status !== existing.status) {
        const productIds = existing.items.map((i) => i.productId);

        if (data.status === 'RETURNED' || data.status === 'CANCELLED') {
          for (const productId of productIds) {
            const otherActive = await tx.rentalItem.count({
              where: {
                productId,
                rental: { status: { in: BLOCKING_RENTAL_STATUSES }, id: { not: rentalId } },
              },
            });
            if (otherActive === 0) {
              await tx.product.update({ where: { id: productId }, data: { status: 'AVAILABLE' } });
            }
          }
        } else if (BLOCKING_RENTAL_STATUSES.includes(data.status)) {
          await tx.product.updateMany({
            where: { id: { in: productIds } },
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
 */
export async function returnRental(req: Request, res: Response): Promise<void> {
  const rentalId = req.params.id;

  const rental = await prisma.$transaction(async (tx) => {
    const existing = await tx.rental.findUnique({
      where: { id: rentalId },
      include: { items: { select: { productId: true } } },
    });
    if (!existing) throw new AppError(404, 'Locacao nao encontrada.');
    if (existing.status === 'RETURNED') throw new AppError(409, 'Esta locacao ja foi devolvida.');
    if (existing.status === 'CANCELLED') throw new AppError(409, 'Locacao cancelada nao pode ser devolvida.');

    const updated = await tx.rental.update({
      where: { id: rentalId },
      data: { status: 'RETURNED' },
      include: rentalInclude,
    });

    for (const item of existing.items) {
      const otherActive = await tx.rentalItem.count({
        where: {
          productId: item.productId,
          rental: { status: { in: BLOCKING_RENTAL_STATUSES }, id: { not: rentalId } },
        },
      });
      if (otherActive === 0) {
        await tx.product.update({ where: { id: item.productId }, data: { status: 'AVAILABLE' } });
      }
    }

    return updated;
  });

  res.json(rental);
}

/**
 * POST /rentals/:id/cancel
 */
export async function cancelRental(req: Request, res: Response): Promise<void> {
  const rentalId = req.params.id;

  const rental = await prisma.$transaction(async (tx) => {
    const existing = await tx.rental.findUnique({
      where: { id: rentalId },
      include: { items: { select: { productId: true } } },
    });
    if (!existing) throw new AppError(404, 'Locacao nao encontrada.');
    if (existing.status === 'CANCELLED') throw new AppError(409, 'Esta locacao ja esta cancelada.');
    if (existing.status === 'RETURNED') throw new AppError(409, 'Locacao ja devolvida nao pode ser cancelada.');

    const updated = await tx.rental.update({
      where: { id: rentalId },
      data: { status: 'CANCELLED' },
      include: rentalInclude,
    });

    for (const item of existing.items) {
      const otherActive = await tx.rentalItem.count({
        where: {
          productId: item.productId,
          rental: { status: { in: BLOCKING_RENTAL_STATUSES }, id: { not: rentalId } },
        },
      });
      if (otherActive === 0) {
        await tx.product.update({ where: { id: item.productId }, data: { status: 'AVAILABLE' } });
      }
    }

    return updated;
  });

  res.json(rental);
}

/**
 * DELETE /rentals/:id
 */
export async function deleteRental(req: Request, res: Response): Promise<void> {
  const rentalId = req.params.id;

  await prisma.$transaction(async (tx) => {
    const existing = await tx.rental.findUnique({
      where: { id: rentalId },
      include: { items: { select: { productId: true } } },
    });
    if (!existing) throw new AppError(404, 'Locacao nao encontrada.');

    await tx.rental.delete({ where: { id: rentalId } });

    if (BLOCKING_RENTAL_STATUSES.includes(existing.status)) {
      for (const item of existing.items) {
        const otherActive = await tx.rentalItem.count({
          where: {
            productId: item.productId,
            rental: { status: { in: BLOCKING_RENTAL_STATUSES } },
          },
        });
        if (otherActive === 0) {
          await tx.product.update({ where: { id: item.productId }, data: { status: 'AVAILABLE' } });
        }
      }
    }
  });

  res.status(204).end();
}
