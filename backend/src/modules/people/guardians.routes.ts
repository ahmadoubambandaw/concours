// Parents / tuteurs : un même compte peut être lié à plusieurs enfants.

import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../config/db';
import { ApiError } from '../../utils/errors';
import { crudRouter } from '../../utils/crud';
import { hashPassword } from '../../utils/password';
import { requirePermission, requireTenant } from '../../middleware/auth.middleware';

const router = Router();

const guardianSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  phone: z.string().min(5),
  email: z.string().email().nullable().optional(),
  occupation: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
});

router.use(
  '/',
  crudRouter({
    model: 'guardian',
    resource: 'guardians',
    createSchema: guardianSchema,
    updateSchema: guardianSchema.partial(),
    searchFields: ['firstName', 'lastName', 'phone', 'email'],
    include: {
      students: {
        include: {
          student: {
            select: { id: true, matricule: true, firstName: true, lastName: true, status: true },
          },
        },
      },
      user: { select: { id: true, email: true, status: true } },
    },
    orderBy: { lastName: 'asc' },
  }),
);

/** Crée un compte portail parent (accès aux dossiers de ses enfants). */
router.post(
  '/:id/account',
  requireTenant,
  requirePermission('users', 'create'),
  async (req, res, next) => {
    try {
      const { email, password } = z
        .object({ email: z.string().email(), password: z.string().min(8) })
        .parse(req.body);
      const guardian = await prisma.guardian.findFirst({
        where: { id: req.params.id, schoolId: req.schoolId },
      });
      if (!guardian) throw ApiError.notFound();
      if (guardian.userId) throw ApiError.conflict('Ce parent a déjà un compte');
      const user = await prisma.user.create({
        data: {
          schoolId: req.schoolId,
          email: email.toLowerCase(),
          password: await hashPassword(password),
          firstName: guardian.firstName,
          lastName: guardian.lastName,
          phone: guardian.phone,
          role: 'PARENT',
        },
      });
      await prisma.guardian.update({ where: { id: guardian.id }, data: { userId: user.id } });
      res.status(201).json({ userId: user.id, email: user.email });
    } catch (err) {
      next(err);
    }
  },
);

export default router;
