// Consultation du journal d'audit de l'établissement.

import { Router } from 'express';
import { prisma } from '../../config/db';
import { requirePermission, requireTenant } from '../../middleware/auth.middleware';
import { getPagination, paginated } from '../../utils/pagination';

const router = Router();

router.get('/', requireTenant, requirePermission('audit', 'read'), async (req, res, next) => {
  try {
    const pagination = getPagination(req, 50);
    const where: any = { schoolId: req.schoolId };
    if (req.query.userId) where.userId = req.query.userId;
    if (req.query.resource) where.resource = req.query.resource;
    const [items, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        include: {
          user: { select: { id: true, firstName: true, lastName: true, role: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: pagination.skip,
        take: pagination.take,
      }),
      prisma.auditLog.count({ where }),
    ]);
    res.json(paginated(items, total, pagination));
  } catch (err) {
    next(err);
  }
});

export default router;
