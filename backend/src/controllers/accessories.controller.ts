import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../prisma';
import { AppError } from '../middleware/errorHandler';

const createSchema = z.object({
  name: z.string().min(1).max(100),
});

export async function listAccessories(_req: Request, res: Response): Promise<void> {
  const accessories = await prisma.accessory.findMany({
    orderBy: { name: 'asc' },
  });
  res.json(accessories);
}

export async function createAccessory(req: Request, res: Response): Promise<void> {
  const { name } = createSchema.parse(req.body);
  const existing = await prisma.accessory.findUnique({ where: { name } });
  if (existing) {
    throw new AppError(409, 'Já existe um acessório com este nome.');
  }
  const accessory = await prisma.accessory.create({ data: { name } });
  res.status(201).json(accessory);
}

export async function deleteAccessory(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const existing = await prisma.accessory.findUnique({ where: { id } });
  if (!existing) {
    throw new AppError(404, 'Acessório não encontrado.');
  }
  await prisma.accessory.delete({ where: { id } });
  res.status(204).end();
}
