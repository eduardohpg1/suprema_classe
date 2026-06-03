import { NextFunction, Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { ZodError } from 'zod';
import { MulterError } from 'multer';

/**
 * Erro de aplicacao com codigo HTTP explicito.
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly details?: unknown;

  constructor(statusCode: number, message: string, details?: unknown) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.details = details;
  }
}

/**
 * Handler 404 para rotas nao encontradas.
 */
export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    error: 'NotFound',
    message: `Rota nao encontrada: ${req.method} ${req.originalUrl}`,
  });
}

/**
 * Handler global de erros. Converte erros conhecidos em respostas HTTP coerentes.
 * DEVE ser o ultimo middleware registrado (assinatura de 4 argumentos).
 */
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction,
): void {
  // Erros de validacao Zod -> 400
  if (err instanceof ZodError) {
    res.status(400).json({
      error: 'ValidationError',
      message: 'Dados invalidos.',
      details: err.errors.map((e) => ({
        path: e.path.join('.'),
        message: e.message,
      })),
    });
    return;
  }

  // Erros do Multer (upload) -> 400
  if (err instanceof MulterError) {
    res.status(400).json({
      error: 'UploadError',
      message: err.code === 'LIMIT_FILE_SIZE'
        ? 'Arquivo excede o tamanho maximo de 5MB.'
        : err.message,
    });
    return;
  }

  // Erros de dominio com statusCode customizado (ex.: AvailabilityConflictError)
  if (
    err instanceof Error &&
    typeof (err as { statusCode?: unknown }).statusCode === 'number'
  ) {
    const statusCode = (err as AppError).statusCode;
    res.status(statusCode).json({
      error: err.name,
      message: err.message,
      ...(typeof (err as AppError).details !== 'undefined'
        ? { details: (err as AppError).details }
        : {}),
    });
    return;
  }

  // Erros conhecidos do Prisma
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    switch (err.code) {
      case 'P2002': {
        const target = (err.meta?.target as string[] | undefined)?.join(', ');
        res.status(409).json({
          error: 'UniqueConstraintViolation',
          message: target
            ? `Ja existe um registro com este valor: ${target}.`
            : 'Violacao de restricao de unicidade.',
        });
        return;
      }
      case 'P2025':
        res.status(404).json({
          error: 'NotFound',
          message: 'Registro nao encontrado.',
        });
        return;
      case 'P2003':
        res.status(409).json({
          error: 'ForeignKeyConstraint',
          message: 'Operacao viola uma restricao de chave estrangeira.',
        });
        return;
      default:
        res.status(400).json({
          error: 'DatabaseError',
          message: `Erro de banco de dados (${err.code}).`,
        });
        return;
    }
  }

  if (err instanceof Prisma.PrismaClientValidationError) {
    res.status(400).json({
      error: 'DatabaseValidationError',
      message: 'Parametros invalidos para a operacao de banco de dados.',
    });
    return;
  }

  // Fallback -> 500
  // eslint-disable-next-line no-console
  console.error('Erro nao tratado:', err);
  res.status(500).json({
    error: 'InternalServerError',
    message: 'Ocorreu um erro inesperado no servidor.',
  });
}

/**
 * Wrapper para handlers async que encaminha rejeicoes ao errorHandler.
 * Evita try/catch repetitivo em todos os controllers.
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>,
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
