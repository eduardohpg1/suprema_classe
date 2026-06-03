import { Request } from 'express';

export interface PaginationParams {
  page: number;
  pageSize: number;
  skip: number;
  take: number;
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

/**
 * Extrai e normaliza parametros de paginacao da query string.
 * Garante limites seguros (page >= 1, pageSize entre 1 e MAX_PAGE_SIZE).
 */
export function getPagination(req: Request): PaginationParams {
  const rawPage = Number.parseInt(String(req.query.page ?? ''), 10);
  const rawPageSize = Number.parseInt(String(req.query.pageSize ?? ''), 10);

  const page =
    Number.isFinite(rawPage) && rawPage > 0 ? rawPage : DEFAULT_PAGE;

  let pageSize =
    Number.isFinite(rawPageSize) && rawPageSize > 0
      ? rawPageSize
      : DEFAULT_PAGE_SIZE;

  if (pageSize > MAX_PAGE_SIZE) pageSize = MAX_PAGE_SIZE;

  return {
    page,
    pageSize,
    skip: (page - 1) * pageSize,
    take: pageSize,
  };
}

/**
 * Monta o objeto de resposta paginada padronizado.
 */
export function buildPaginatedResult<T>(
  data: T[],
  total: number,
  params: PaginationParams,
): PaginatedResult<T> {
  const totalPages = Math.max(1, Math.ceil(total / params.pageSize));

  return {
    data,
    pagination: {
      page: params.page,
      pageSize: params.pageSize,
      total,
      totalPages,
      hasNext: params.page < totalPages,
      hasPrev: params.page > 1,
    },
  };
}
