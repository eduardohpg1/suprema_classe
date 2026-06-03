import { Request, Response } from 'express';
import { prisma } from '../prisma';

const RESULT_LIMIT = 10;

/**
 * GET /search?q=termo
 * Busca global em clientes (nome/CPF), produtos (nome/codigo) e locacoes.
 */
export async function search(req: Request, res: Response): Promise<void> {
  const raw = typeof req.query.q === 'string' ? req.query.q.trim() : '';

  if (raw.length < 2) {
    res.json({ query: raw, customers: [], products: [], rentals: [] });
    return;
  }

  const digits = raw.replace(/\D/g, '');

  const [customers, products, rentals] = await Promise.all([
    prisma.customer.findMany({
      where: {
        OR: [
          { name: { contains: raw, mode: 'insensitive' } },
          ...(digits ? [{ cpf: { contains: digits } }] : []),
        ],
      },
      take: RESULT_LIMIT,
      orderBy: { name: 'asc' },
      select: { id: true, name: true, cpf: true, phone: true },
    }),
    prisma.product.findMany({
      where: {
        OR: [
          { name: { contains: raw, mode: 'insensitive' } },
          { code: { contains: raw, mode: 'insensitive' } },
        ],
      },
      take: RESULT_LIMIT,
      orderBy: { name: 'asc' },
      select: {
        id: true,
        code: true,
        name: true,
        status: true,
        size: true,
        color: true,
      },
    }),
    // Locacoes onde o cliente ou produto casam com o termo.
    prisma.rental.findMany({
      where: {
        OR: [
          { customer: { name: { contains: raw, mode: 'insensitive' } } },
          ...(digits ? [{ customer: { cpf: { contains: digits } } }] : []),
          { product: { name: { contains: raw, mode: 'insensitive' } } },
          { product: { code: { contains: raw, mode: 'insensitive' } } },
        ],
      },
      take: RESULT_LIMIT,
      orderBy: { pickupDate: 'desc' },
      include: {
        customer: { select: { id: true, name: true } },
        product: { select: { id: true, code: true, name: true } },
      },
    }),
  ]);

  res.json({
    query: raw,
    customers,
    products,
    rentals,
  });
}
