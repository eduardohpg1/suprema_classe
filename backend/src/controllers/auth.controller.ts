import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '../prisma';
import { signToken } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';

const loginSchema = z.object({
  email: z.string().email('E-mail invalido.'),
  password: z.string().min(1, 'Senha obrigatoria.'),
});

const registerSchema = z.object({
  name: z.string().min(2, 'Nome muito curto.'),
  email: z.string().email('E-mail invalido.'),
  password: z.string().min(6, 'Senha deve ter ao menos 6 caracteres.'),
  role: z.enum(['ADMIN', 'STAFF']).optional(),
});

/**
 * POST /auth/login
 * Autentica um usuario e retorna um JWT.
 */
export async function login(req: Request, res: Response): Promise<void> {
  const { email, password } = loginSchema.parse(req.body);

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    throw new AppError(401, 'Credenciais invalidas.');
  }

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) {
    throw new AppError(401, 'Credenciais invalidas.');
  }

  const token = signToken({ sub: user.id, email: user.email, role: user.role });

  res.json({
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
  });
}

/**
 * POST /auth/register
 * Cria um novo usuario do sistema (operacao administrativa).
 */
export async function register(req: Request, res: Response): Promise<void> {
  const { name, email, password, role } = registerSchema.parse(req.body);

  const hashed = await bcrypt.hash(password, 10);

  const user = await prisma.user.create({
    data: { name, email, password: hashed, role: role ?? 'STAFF' },
    select: { id: true, name: true, email: true, role: true, createdAt: true },
  });

  res.status(201).json(user);
}

/**
 * GET /auth/me
 * Retorna o usuario autenticado a partir do token.
 */
export async function me(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    throw new AppError(401, 'Nao autenticado.');
  }

  const user = await prisma.user.findUnique({
    where: { id: req.user.sub },
    select: { id: true, name: true, email: true, role: true, createdAt: true },
  });

  if (!user) {
    throw new AppError(404, 'Usuario nao encontrado.');
  }

  res.json(user);
}
