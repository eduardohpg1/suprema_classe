import { Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../prisma';
import { AppError } from '../middleware/errorHandler';
import { getPagination, buildPaginatedResult } from '../utils/pagination';

/**
 * Normaliza CPF removendo pontuacao (mantem apenas digitos).
 */
function normalizeCpf(cpf: string): string {
  return cpf.replace(/\D/g, '');
}

const createCustomerSchema = z.object({
  name: z.string().min(2, 'Nome muito curto.').max(150),
  cpf: z
    .string()
    .transform(normalizeCpf)
    .refine((v) => v.length === 11, 'CPF deve conter 11 digitos.'),
  rg: z.string().max(20).optional().nullable(),
  phone: z.string().min(8, 'Telefone invalido.').max(20),
  address: z.string().max(255).optional().nullable(),
  notes: z.string().max(1000).optional().nullable(),
});

const updateCustomerSchema = createCustomerSchema.partial();

/**
 * GET /customers
 * Busca por nome ou CPF. Paginado.
 */
export async function listCustomers(req: Request, res: Response): Promise<void> {
  const pagination = getPagination(req);
  const { search } = req.query;

  const where: Prisma.CustomerWhereInput = {};

  if (typeof search === 'string' && search.trim()) {
    const term = search.trim();
    const digits = term.replace(/\D/g, '');
    where.OR = [
      { name: { contains: term, mode: 'insensitive' } },
      ...(digits ? [{ cpf: { contains: digits } }] : []),
    ];
  }

  const [customers, total] = await Promise.all([
    prisma.customer.findMany({
      where,
      orderBy: { name: 'asc' },
      skip: pagination.skip,
      take: pagination.take,
      include: { _count: { select: { rentals: true, reservations: true } } },
    }),
    prisma.customer.count({ where }),
  ]);

  res.json(buildPaginatedResult(customers, total, pagination));
}

/**
 * GET /customers/:id
 * Inclui historico de locacoes e reservas.
 */
export async function getCustomer(req: Request, res: Response): Promise<void> {
  const customer = await prisma.customer.findUnique({
    where: { id: req.params.id },
    include: {
      rentals: {
        orderBy: { pickupDate: 'desc' },
        include: { items: { include: { product: { select: { id: true, code: true, name: true } } }, take: 1 } },
      },
      reservations: {
        orderBy: { date: 'desc' },
        include: { product: { select: { id: true, code: true, name: true } } },
      },
    },
  });

  if (!customer) {
    throw new AppError(404, 'Cliente nao encontrado.');
  }

  res.json(customer);
}

/**
 * POST /customers
 */
export async function createCustomer(req: Request, res: Response): Promise<void> {
  const data = createCustomerSchema.parse(req.body);

  const customer = await prisma.customer.create({
    data: {
      name: data.name,
      cpf: data.cpf,
      rg: data.rg ?? null,
      phone: data.phone,
      address: data.address ?? null,
      notes: data.notes ?? null,
    },
  });

  res.status(201).json(customer);
}

/**
 * PUT /customers/:id
 */
export async function updateCustomer(req: Request, res: Response): Promise<void> {
  const data = updateCustomerSchema.parse(req.body);

  const updateData: Prisma.CustomerUpdateInput = {};
  if (data.name !== undefined) updateData.name = data.name;
  if (data.cpf !== undefined) updateData.cpf = data.cpf;
  if (data.rg !== undefined) updateData.rg = data.rg;
  if (data.phone !== undefined) updateData.phone = data.phone;
  if (data.address !== undefined) updateData.address = data.address;
  if (data.notes !== undefined) updateData.notes = data.notes;

  const customer = await prisma.customer.update({
    where: { id: req.params.id },
    data: updateData,
  });

  res.json(customer);
}

/**
 * DELETE /customers/:id
 * So permite excluir se nao houver locacoes ativas.
 */
export async function deleteCustomer(req: Request, res: Response): Promise<void> {
  const activeRentals = await prisma.rental.count({
    where: {
      customerId: req.params.id,
      status: { in: ['ACTIVE', 'OVERDUE'] },
    },
  });

  if (activeRentals > 0) {
    throw new AppError(
      409,
      'Nao e possivel excluir: o cliente possui locacoes ativas.',
    );
  }

  await prisma.customer.delete({ where: { id: req.params.id } });
  res.status(204).send();
}
