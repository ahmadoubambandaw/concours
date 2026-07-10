import type { Request } from 'express';

export interface Pagination {
  page: number;
  pageSize: number;
  skip: number;
  take: number;
}

export const getPagination = (req: Request, defaultSize = 20, maxSize = 100): Pagination => {
  const page = Math.max(1, parseInt(String(req.query.page ?? '1'), 10) || 1);
  const pageSize = Math.min(
    maxSize,
    Math.max(1, parseInt(String(req.query.pageSize ?? String(defaultSize)), 10) || defaultSize),
  );
  return { page, pageSize, skip: (page - 1) * pageSize, take: pageSize };
};

export const paginated = <T>(items: T[], total: number, { page, pageSize }: Pagination) => ({
  items,
  total,
  page,
  pageSize,
  totalPages: Math.ceil(total / pageSize) || 1,
});
