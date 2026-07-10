// Communication : envoi de messages multi-canal (email, SMS, WhatsApp, push,
// interne), annonces, notifications in-app, gestion documentaire.

import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../config/db';
import { ApiError } from '../../utils/errors';
import { crudRouter } from '../../utils/crud';
import { sendViaChannel } from '../../services/notify';
import { requirePermission, requireTenant } from '../../middleware/auth.middleware';
import { getPagination, paginated } from '../../utils/pagination';

const router = Router();

// --- Messages ---

const messageSchema = z.object({
  channel: z.enum(['INTERNAL', 'EMAIL', 'SMS', 'WHATSAPP', 'PUSH']).default('INTERNAL'),
  audience: z.string().default('ALL'), // ALL | PARENTS | TEACHERS | STAFF | CLASS:<id> | USER:<id>
  subject: z.string().optional(),
  body: z.string().min(1),
});

/** Résout la liste des destinataires selon l'audience. */
const resolveRecipients = async (schoolId: string, audience: string, channel: string) => {
  const contactOf = (u: { email: string; phone: string | null }) =>
    channel === 'EMAIL' || channel === 'INTERNAL' || channel === 'PUSH' ? u.email : u.phone;

  if (audience.startsWith('USER:')) {
    const user = await prisma.user.findFirst({
      where: { id: audience.slice(5), schoolId },
      select: { email: true, phone: true },
    });
    return user ? [contactOf(user)].filter((c): c is string => Boolean(c)) : [];
  }
  if (audience.startsWith('CLASS:')) {
    // Parents des élèves de la classe.
    const enrollments = await prisma.enrollment.findMany({
      where: { classId: audience.slice(6), schoolId, status: 'ACTIVE' },
      include: { student: { include: { guardians: { include: { guardian: true } } } } },
    });
    const contacts = enrollments.flatMap((e) =>
      e.student.guardians.map((g) =>
        channel === 'SMS' || channel === 'WHATSAPP' ? g.guardian.phone : g.guardian.email,
      ),
    );
    return [...new Set(contacts.filter(Boolean))] as string[];
  }
  const roleFilter =
    audience === 'PARENTS'
      ? ['PARENT']
      : audience === 'TEACHERS'
        ? ['TEACHER']
        : audience === 'STAFF'
          ? ['SECRETARY', 'ACCOUNTANT', 'SUPERVISOR', 'LIBRARIAN', 'NURSE', 'DRIVER']
          : undefined;
  const users = await prisma.user.findMany({
    where: { schoolId, status: 'ACTIVE', ...(roleFilter ? { role: { in: roleFilter as any } } : {}) },
    select: { email: true, phone: true },
  });
  return [...new Set(users.map(contactOf).filter((c): c is string => Boolean(c)))];
};

router.post(
  '/messages',
  requireTenant,
  requirePermission('communication', 'create'),
  async (req, res, next) => {
    try {
      const data = messageSchema.parse(req.body);
      const recipients = await resolveRecipients(req.schoolId!, data.audience, data.channel);

      let sent = 0;
      for (const to of recipients) {
        const ok = await sendViaChannel(data.channel, {
          to,
          subject: data.subject,
          body: data.body,
        });
        if (ok) sent += 1;
      }

      const message = await prisma.message.create({
        data: {
          schoolId: req.schoolId!,
          senderId: req.user!.id,
          channel: data.channel,
          audience: data.audience,
          subject: data.subject,
          body: data.body,
          status: sent > 0 || recipients.length === 0 ? 'SENT' : 'FAILED',
        },
      });
      res.status(201).json({ message, recipients: recipients.length, sent });
    } catch (err) {
      next(err);
    }
  },
);

router.get(
  '/messages',
  requireTenant,
  requirePermission('communication', 'read'),
  async (req, res, next) => {
    try {
      const pagination = getPagination(req);
      const where = { schoolId: req.schoolId };
      const [items, total] = await Promise.all([
        prisma.message.findMany({
          where,
          include: { sender: { select: { id: true, firstName: true, lastName: true } } },
          orderBy: { sentAt: 'desc' },
          skip: pagination.skip,
          take: pagination.take,
        }),
        prisma.message.count({ where }),
      ]);
      res.json(paginated(items, total, pagination));
    } catch (err) {
      next(err);
    }
  },
);

// --- Annonces ---

const announcementSchema = z.object({
  title: z.string().min(1),
  body: z.string().min(1),
  audience: z.string().default('ALL'),
  pinned: z.boolean().default(false),
});

router.use(
  '/announcements',
  crudRouter({
    model: 'announcement',
    resource: 'communication',
    createSchema: announcementSchema,
    updateSchema: announcementSchema.partial(),
    searchFields: ['title'],
    orderBy: [{ pinned: 'desc' }, { createdAt: 'desc' }],
  }),
);

// --- Notifications in-app de l'utilisateur courant ---

router.get('/notifications', async (req, res, next) => {
  try {
    const notifications = await prisma.notification.findMany({
      where: { userId: req.user!.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    const unread = await prisma.notification.count({
      where: { userId: req.user!.id, read: false },
    });
    res.json({ notifications, unread });
  } catch (err) {
    next(err);
  }
});

router.post('/notifications/read-all', async (req, res, next) => {
  try {
    await prisma.notification.updateMany({
      where: { userId: req.user!.id, read: false },
      data: { read: true },
    });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// --- Documents ---

const documentSchema = z.object({
  name: z.string().min(1),
  type: z.string().default('AUTRE'),
  url: z.string().min(1),
  mimeType: z.string().optional(),
  size: z.number().int().optional(),
  studentId: z.string().uuid().nullable().optional(),
});

router.use(
  '/documents',
  crudRouter({
    model: 'document',
    resource: 'documents',
    createSchema: documentSchema,
    updateSchema: documentSchema.partial(),
    searchFields: ['name', 'type'],
    filterFields: ['type', 'studentId'],
    include: {
      student: { select: { id: true, matricule: true, firstName: true, lastName: true } },
    },
    orderBy: { createdAt: 'desc' },
  }),
);

export default router;
