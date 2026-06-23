import { Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../prisma';
import { AppError } from '../middleware/errorHandler';
import { getPagination, buildPaginatedResult } from '../utils/pagination';
import { BLOCKING_RENTAL_STATUSES } from '../utils/availability';
import { buildPublicUrl, deleteUploadFile } from '../middleware/upload';

const PRODUCT_STATUSES = ['AVAILABLE', 'RESERVED', 'RENTED', 'MAINTENANCE'] as const;

const createProductSchema = z.object({
  code: z.string().max(50).optional().default(''),
  name: z.string().min(2, 'Nome muito curto.').max(150),
  categoryId: z.string().min(1, 'Categoria obrigatoria.'),
  size: z.string().min(1, 'Tamanho obrigatorio.').max(20),
  color: z.string().min(1, 'Cor obrigatoria.').max(50),
  rentalPrice: z.coerce.number().nonnegative('Preco de locacao invalido.'),
  salePrice: z.coerce.number().nonnegative().optional().nullable(),
  notes: z.string().max(1000).optional().nullable(),
  status: z.enum(PRODUCT_STATUSES).optional(),
});

const updateProductSchema = createProductSchema.partial();

/**
 * GET /products
 * Filtros: categoryId, status, search (nome ou codigo). Paginado.
 */
export async function listProducts(req: Request, res: Response): Promise<void> {
  const pagination = getPagination(req);
  const { categoryId, status, search } = req.query;

  const where: Prisma.ProductWhereInput = {};

  if (typeof categoryId === 'string' && categoryId) {
    where.categoryId = categoryId;
  }

  if (typeof status === 'string' && (PRODUCT_STATUSES as readonly string[]).includes(status)) {
    where.status = status as Prisma.ProductWhereInput['status'];
  }

  if (typeof search === 'string' && search.trim()) {
    const term = search.trim();
    where.OR = [
      { name: { contains: term, mode: 'insensitive' } },
      { code: { contains: term, mode: 'insensitive' } },
    ];
  }

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      include: {
        category: { select: { id: true, name: true } },
        photos: { orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }] },
      },
      orderBy: { createdAt: 'desc' },
      skip: pagination.skip,
      take: pagination.take,
    }),
    prisma.product.count({ where }),
  ]);

  res.json(buildPaginatedResult(products, total, pagination));
}

/**
 * GET /products/:id
 * Inclui fotos e historico de locacoes.
 */
export async function getProduct(req: Request, res: Response): Promise<void> {
  const product = await prisma.product.findUnique({
    where: { id: req.params.id },
    include: {
      category: { select: { id: true, name: true } },
      photos: { orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }] },
      rentalItems: {
        orderBy: { rental: { pickupDate: 'desc' } },
        include: {
          rental: {
            select: {
              id: true,
              pickupDate: true,
              returnDate: true,
              status: true,
              customer: { select: { id: true, name: true, phone: true } },
            },
          },
        },
      },
      reservations: {
        orderBy: { date: 'desc' },
        include: {
          customer: { select: { id: true, name: true, phone: true } },
        },
      },
    },
  });

  if (!product) {
    throw new AppError(404, 'Produto nao encontrado.');
  }

  res.json(product);
}

/**
 * POST /products
 */
export async function createProduct(req: Request, res: Response): Promise<void> {
  const data = createProductSchema.parse(req.body);

  // Garante que a categoria existe (mensagem amigavel em vez de erro de FK).
  const category = await prisma.category.findUnique({ where: { id: data.categoryId } });
  if (!category) {
    throw new AppError(400, 'Categoria informada nao existe.');
  }

  // Gera codigo unico automatico quando nao informado
  const finalCode = data.code?.trim()
    ? data.code.trim()
    : `AUTO-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

  const product = await prisma.product.create({
    data: {
      code: finalCode,
      name: data.name,
      categoryId: data.categoryId,
      size: data.size,
      color: data.color,
      rentalPrice: new Prisma.Decimal(data.rentalPrice),
      salePrice:
        data.salePrice === undefined || data.salePrice === null
          ? null
          : new Prisma.Decimal(data.salePrice),
      notes: data.notes ?? null,
      status: data.status ?? 'AVAILABLE',
    },
    include: { category: { select: { id: true, name: true } } },
  });

  res.status(201).json(product);
}

/**
 * PUT /products/:id
 */
export async function updateProduct(req: Request, res: Response): Promise<void> {
  const data = updateProductSchema.parse(req.body);

  if (data.categoryId) {
    const category = await prisma.category.findUnique({ where: { id: data.categoryId } });
    if (!category) {
      throw new AppError(400, 'Categoria informada nao existe.');
    }
  }

  const updateData: Prisma.ProductUpdateInput = {};
  if (data.code !== undefined) updateData.code = data.code;
  if (data.name !== undefined) updateData.name = data.name;
  if (data.categoryId !== undefined) {
    updateData.category = { connect: { id: data.categoryId } };
  }
  if (data.size !== undefined) updateData.size = data.size;
  if (data.color !== undefined) updateData.color = data.color;
  if (data.rentalPrice !== undefined) {
    updateData.rentalPrice = new Prisma.Decimal(data.rentalPrice);
  }
  if (data.salePrice !== undefined) {
    updateData.salePrice =
      data.salePrice === null ? null : new Prisma.Decimal(data.salePrice);
  }
  if (data.notes !== undefined) updateData.notes = data.notes;
  if (data.status !== undefined) updateData.status = data.status;

  const product = await prisma.product.update({
    where: { id: req.params.id },
    data: updateData,
    include: {
      category: { select: { id: true, name: true } },
      photos: { orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }] },
    },
  });

  res.json(product);
}

/**
 * DELETE /products/:id
 * So permite excluir se nao houver locacoes ativas (ACTIVE/OVERDUE).
 * Remove fotos do disco em cascata.
 */
export async function deleteProduct(req: Request, res: Response): Promise<void> {
  const activeRentals = await prisma.rentalItem.count({
    where: {
      productId: req.params.id,
      rental: { status: { in: BLOCKING_RENTAL_STATUSES } },
    },
  });

  if (activeRentals > 0) {
    throw new AppError(
      409,
      'Nao e possivel excluir: o produto possui locacoes ativas.',
    );
  }

  // Recupera fotos para remover arquivos fisicos.
  const photos = await prisma.photo.findMany({
    where: { productId: req.params.id },
    select: { filename: true },
  });

  await prisma.product.delete({ where: { id: req.params.id } });

  // Limpa arquivos do disco (Photo tem onDelete: Cascade no banco).
  photos.forEach((p) => deleteUploadFile(p.filename));

  res.status(204).send();
}

/**
 * POST /products/:id/photos
 * Upload de uma ou mais fotos. A primeira foto do produto vira primaria.
 */
export async function uploadPhotos(req: Request, res: Response): Promise<void> {
  const productId = req.params.id;
  const files = (req.files as Express.Multer.File[] | undefined) ?? [];

  if (files.length === 0) {
    throw new AppError(400, 'Nenhum arquivo de imagem enviado.');
  }

  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { id: true },
  });
  if (!product) {
    // Remove arquivos orfaos ja gravados em disco.
    files.forEach((f) => deleteUploadFile(f.filename));
    throw new AppError(404, 'Produto nao encontrado.');
  }

  const existingCount = await prisma.photo.count({ where: { productId } });

  const created = await prisma.$transaction(
    files.map((file, index) =>
      prisma.photo.create({
        data: {
          productId,
          url: buildPublicUrl(file.filename),
          filename: file.filename,
          // Define como primaria se ainda nao houver nenhuma foto.
          isPrimary: existingCount === 0 && index === 0,
        },
      }),
    ),
  );

  res.status(201).json(created);
}

/**
 * DELETE /products/:productId/photos/:photoId
 * Remove uma foto. Se era primaria, promove a proxima foto disponivel.
 */
export async function deletePhoto(req: Request, res: Response): Promise<void> {
  const { productId, photoId } = req.params;

  const photo = await prisma.photo.findUnique({ where: { id: photoId } });
  if (!photo || photo.productId !== productId) {
    throw new AppError(404, 'Foto nao encontrada para este produto.');
  }

  await prisma.$transaction(async (tx) => {
    await tx.photo.delete({ where: { id: photoId } });

    if (photo.isPrimary) {
      const next = await tx.photo.findFirst({
        where: { productId },
        orderBy: { createdAt: 'asc' },
      });
      if (next) {
        await tx.photo.update({
          where: { id: next.id },
          data: { isPrimary: true },
        });
      }
    }
  });

  deleteUploadFile(photo.filename);

  res.status(204).send();
}

/**
 * PATCH /products/:productId/photos/:photoId/primary
 * Define uma foto como primaria, desmarcando as demais do mesmo produto.
 */
export async function setPhotoAsPrimary(req: Request, res: Response): Promise<void> {
  const { productId, photoId } = req.params;

  const photo = await prisma.photo.findUnique({ where: { id: photoId } });
  if (!photo || photo.productId !== productId) {
    throw new AppError(404, 'Foto nao encontrada para este produto.');
  }

  await prisma.$transaction([
    prisma.photo.updateMany({
      where: { productId, isPrimary: true },
      data: { isPrimary: false },
    }),
    prisma.photo.update({
      where: { id: photoId },
      data: { isPrimary: true },
    }),
  ]);

  const photos = await prisma.photo.findMany({
    where: { productId },
    orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
  });

  res.json(photos);
}
