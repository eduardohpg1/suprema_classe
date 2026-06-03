import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../prisma';
import { AppError } from '../middleware/errorHandler';

const categorySchema = z.object({
  name: z.string().min(2, 'Nome da categoria muito curto.').max(100),
});

/**
 * GET /categories
 * Lista todas as categorias com a contagem de produtos.
 */
export async function listCategories(_req: Request, res: Response): Promise<void> {
  const categories = await prisma.category.findMany({
    orderBy: { name: 'asc' },
    include: { _count: { select: { products: true } } },
  });

  res.json(
    categories.map((c) => ({
      id: c.id,
      name: c.name,
      productCount: c._count.products,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
    })),
  );
}

/**
 * GET /categories/:id
 */
export async function getCategory(req: Request, res: Response): Promise<void> {
  const category = await prisma.category.findUnique({
    where: { id: req.params.id },
    include: { _count: { select: { products: true } } },
  });

  if (!category) {
    throw new AppError(404, 'Categoria nao encontrada.');
  }

  res.json({
    id: category.id,
    name: category.name,
    productCount: category._count.products,
    createdAt: category.createdAt,
    updatedAt: category.updatedAt,
  });
}

/**
 * POST /categories
 */
export async function createCategory(req: Request, res: Response): Promise<void> {
  const { name } = categorySchema.parse(req.body);
  const category = await prisma.category.create({ data: { name } });
  res.status(201).json(category);
}

/**
 * PUT /categories/:id
 */
export async function updateCategory(req: Request, res: Response): Promise<void> {
  const { name } = categorySchema.parse(req.body);
  const category = await prisma.category.update({
    where: { id: req.params.id },
    data: { name },
  });
  res.json(category);
}

/**
 * DELETE /categories/:id
 * So permite excluir se nao houver produtos associados.
 */
export async function deleteCategory(req: Request, res: Response): Promise<void> {
  const count = await prisma.product.count({
    where: { categoryId: req.params.id },
  });

  if (count > 0) {
    throw new AppError(
      409,
      `Nao e possivel excluir: existem ${count} produto(s) nesta categoria.`,
    );
  }

  await prisma.category.delete({ where: { id: req.params.id } });
  res.status(204).send();
}
