// Fabrique de routeurs CRUD multi-tenant.
//
// Tous les modèles métier portent un `schoolId` : chaque requête est
// automatiquement restreinte au tenant du token (req.schoolId), aussi bien
// en lecture qu'en écriture — un utilisateur ne peut jamais lire ni modifier
// les données d'un autre établissement.

import { Router, type Request } from 'express';
import type { ZodSchema } from 'zod';
import { prisma } from '../config/db';
import { ApiError } from './errors';
import { getPagination, paginated } from './pagination';
import { requirePermission, requireTenant } from '../middleware/auth.middleware';
import type { Action } from '../auth/permissions';

export interface CrudOptions {
  /** Nom de l'accesseur Prisma, ex: 'level' pour prisma.level */
  model: string;
  /** Ressource RBAC, ex: 'levels' */
  resource: string;
  createSchema: ZodSchema<any>;
  updateSchema: ZodSchema<any>;
  /** Champs texte utilisés par ?search= */
  searchFields?: string[];
  /** Champs filtrables par égalité via la query string, ex: ['status', 'classId'] */
  filterFields?: string[];
  include?: Record<string, unknown>;
  orderBy?: Record<string, unknown> | Record<string, unknown>[];
  /** Transforme les données validées avant insertion. */
  beforeCreate?: (req: Request, data: any) => Promise<any> | any;
  beforeUpdate?: (req: Request, data: any) => Promise<any> | any;
  /** Suppression réelle interdite : bascule un champ status à la place. */
  softDelete?: { field: string; value: string };
}

const delegate = (model: string) => (prisma as any)[model];

export const buildWhere = (req: Request, options: CrudOptions) => {
  const where: any = { schoolId: req.schoolId };
  const search = String(req.query.search ?? '').trim();
  if (search && options.searchFields?.length) {
    where.OR = options.searchFields.map((field) => ({
      [field]: { contains: search, mode: 'insensitive' },
    }));
  }
  for (const field of options.filterFields ?? []) {
    const value = req.query[field];
    if (value !== undefined && value !== '') where[field] = value;
  }
  return where;
};

export const crudRouter = (options: CrudOptions): Router => {
  const router = Router();
  const guard = (action: Action) => [requireTenant, requirePermission(options.resource, action)];

  router.get('/', ...guard('read'), async (req, res, next) => {
    try {
      const pagination = getPagination(req);
      const where = buildWhere(req, options);
      const [items, total] = await Promise.all([
        delegate(options.model).findMany({
          where,
          include: options.include,
          orderBy: options.orderBy ?? { createdAt: 'desc' },
          skip: pagination.skip,
          take: pagination.take,
        }),
        delegate(options.model).count({ where }),
      ]);
      res.json(paginated(items, total, pagination));
    } catch (err) {
      next(err);
    }
  });

  router.get('/:id', ...guard('read'), async (req, res, next) => {
    try {
      const item = await delegate(options.model).findFirst({
        where: { id: req.params.id, schoolId: req.schoolId },
        include: options.include,
      });
      if (!item) throw ApiError.notFound();
      res.json(item);
    } catch (err) {
      next(err);
    }
  });

  router.post('/', ...guard('create'), async (req, res, next) => {
    try {
      let data = options.createSchema.parse(req.body);
      if (options.beforeCreate) data = await options.beforeCreate(req, data);
      const item = await delegate(options.model).create({
        data: { ...data, schoolId: req.schoolId },
        include: options.include,
      });
      res.status(201).json(item);
    } catch (err) {
      next(err);
    }
  });

  router.patch('/:id', ...guard('update'), async (req, res, next) => {
    try {
      let data = options.updateSchema.parse(req.body);
      if (options.beforeUpdate) data = await options.beforeUpdate(req, data);
      const existing = await delegate(options.model).findFirst({
        where: { id: req.params.id, schoolId: req.schoolId },
        select: { id: true },
      });
      if (!existing) throw ApiError.notFound();
      const item = await delegate(options.model).update({
        where: { id: req.params.id },
        data,
        include: options.include,
      });
      res.json(item);
    } catch (err) {
      next(err);
    }
  });

  router.delete('/:id', ...guard('delete'), async (req, res, next) => {
    try {
      const existing = await delegate(options.model).findFirst({
        where: { id: req.params.id, schoolId: req.schoolId },
        select: { id: true },
      });
      if (!existing) throw ApiError.notFound();
      if (options.softDelete) {
        await delegate(options.model).update({
          where: { id: req.params.id },
          data: { [options.softDelete.field]: options.softDelete.value },
        });
      } else {
        await delegate(options.model).delete({ where: { id: req.params.id } });
      }
      res.json({ ok: true });
    } catch (err) {
      next(err);
    }
  });

  return router;
};
