import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { AppError } from './errorHandler';

export interface JwtPayload {
  sub: string;
  email: string;
  role: string;
}

// Estende o Request do Express para carregar o usuario autenticado.
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

function getSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new AppError(500, 'JWT_SECRET nao configurado no ambiente.');
  }
  return secret;
}

/**
 * Gera um token JWT assinado para um usuario.
 */
export function signToken(payload: JwtPayload): string {
  const expiresIn = process.env.JWT_EXPIRES_IN ?? '7d';
  return jwt.sign(payload, getSecret(), { expiresIn } as jwt.SignOptions);
}

/**
 * Middleware de autenticacao. Exige header `Authorization: Bearer <token>` valido.
 * Em sucesso, injeta `req.user`.
 */
export function authenticate(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  const header = req.headers.authorization;

  if (!header || !header.startsWith('Bearer ')) {
    throw new AppError(401, 'Token de autenticacao ausente ou malformado.');
  }

  const token = header.slice('Bearer '.length).trim();

  try {
    const decoded = jwt.verify(token, getSecret()) as JwtPayload;
    req.user = decoded;
    next();
  } catch {
    throw new AppError(401, 'Token invalido ou expirado.');
  }
}

/**
 * Middleware de autorizacao por role. Use apos `authenticate`.
 */
export function authorize(...roles: string[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      throw new AppError(401, 'Nao autenticado.');
    }
    if (roles.length > 0 && !roles.includes(req.user.role)) {
      throw new AppError(403, 'Acesso negado: permissao insuficiente.');
    }
    next();
  };
}
