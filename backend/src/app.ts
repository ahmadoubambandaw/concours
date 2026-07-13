// Assemblage de l'application Express : sécurité (Helmet, CORS, rate-limit),
// routes publiques (santé, pré-inscription en ligne) et API authentifiée.

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { env } from './config/env';
import { prisma } from './config/db';
import { authenticate } from './middleware/auth.middleware';
import { auditLogger } from './middleware/audit.middleware';
import { errorHandler, notFoundHandler } from './middleware/error.middleware';

import authRoutes from './modules/auth/auth.routes';
import schoolsRoutes from './modules/schools/schools.routes';
import academicsRoutes from './modules/academics/academics.routes';
import teachersRoutes from './modules/people/teachers.routes';
import studentsRoutes from './modules/people/students.routes';
import guardiansRoutes from './modules/people/guardians.routes';
import enrollmentRoutes from './modules/enrollment/enrollment.routes';
import financeRoutes from './modules/finance/finance.routes';
import financeOnlineRoutes from './modules/finance/online.routes';
import subscriptionRoutes, { publicSubscriptionRouter } from './modules/subscription/subscription.routes';
import { requireFeature } from './middleware/plan.middleware';
import attendanceRoutes from './modules/attendance/attendance.routes';
import gradesRoutes from './modules/grades/grades.routes';
import timetableRoutes from './modules/timetable/timetable.routes';
import planningRoutes from './modules/planning/planning.routes';
import servicesRoutes from './modules/services/services.routes';
import welfareRoutes from './modules/welfare/welfare.routes';
import hrRoutes from './modules/hr/hr.routes';
import commsRoutes from './modules/comms/comms.routes';
import dashboardRoutes from './modules/dashboard/dashboard.routes';
import reportsRoutes from './modules/reports/reports.routes';
import aiRoutes from './modules/ai/ai.routes';
import portalRoutes from './modules/portal/portal.routes';
import platformRoutes from './modules/platform/platform.routes';
import auditRoutes from './modules/audit/audit.routes';

export const createApp = () => {
  const app = express();

  app.set('trust proxy', 1);
  app.use(helmet());
  app.use(cors({ origin: env.cors.origins, credentials: true }));
  app.use(compression());
  app.use(express.json({ limit: '5mb' }));
  // Les callbacks IPN PayDunya arrivent en application/x-www-form-urlencoded.
  app.use(express.urlencoded({ extended: true }));
  if (!env.isProd) app.use(morgan('dev'));

  // Limite globale (les routes d'auth ont leur propre limite plus stricte).
  app.use(
    '/api/',
    rateLimit({ windowMs: 60 * 1000, max: 600, standardHeaders: true, legacyHeaders: false }),
  );

  app.get('/health', (_req, res) => res.json({ status: 'ok', uptime: process.uptime() }));

  // Le routeur `v1` regroupe tout : il est monté sous /api/v1 (standard)
  // et sous /api/backend (alias utilisé par le déploiement mono-projet
  // Vercel, où le frontend et l'API partagent le même domaine).
  const v1 = express.Router();

  // ------------------------------------------------------------------
  // Routes publiques (sans authentification)
  // ------------------------------------------------------------------
  v1.use('/auth', authRoutes);

  // Formulaire de pré-inscription en ligne, accessible aux familles
  // via le code public de l'établissement.
  const publicPreRegSchema = z.object({
    firstName: z.string().min(1),
    lastName: z.string().min(1),
    gender: z.enum(['M', 'F']),
    birthDate: z.coerce.date(),
    desiredLevel: z.string().min(1),
    previousSchool: z.string().optional(),
    guardianName: z.string().min(2),
    guardianPhone: z.string().min(5),
    guardianEmail: z.string().email().optional(),
    notes: z.string().optional(),
  });
  v1.post('/public/:schoolCode/preregistrations', async (req, res, next) => {
    try {
      const school = await prisma.school.findUnique({
        where: { code: req.params.schoolCode.toUpperCase() },
      });
      if (!school || school.status === 'CLOSED' || school.status === 'SUSPENDED') {
        return res.status(404).json({ error: 'Établissement introuvable' });
      }
      const data = publicPreRegSchema.parse(req.body);
      const preReg = await prisma.preRegistration.create({
        data: { ...data, schoolId: school.id },
      });
      res.status(201).json({ id: preReg.id, message: 'Pré-inscription enregistrée. L\'établissement vous contactera.' });
    } catch (err) {
      next(err);
    }
  });

  // Paiements en ligne PayDunya : le webhook IPN doit rester public ;
  // les routes checkout/status appliquent `authenticate` en interne.
  v1.use('/finance/online', financeOnlineRoutes);

  // Abonnements — grille tarifaire publique + webhook d'activation PayDunya.
  v1.use('/subscription', publicSubscriptionRouter);

  // Informations publiques d'un établissement (page de pré-inscription).
  v1.get('/public/:schoolCode', async (req, res, next) => {
    try {
      const school = await prisma.school.findUnique({
        where: { code: req.params.schoolCode.toUpperCase() },
        select: { name: true, type: true, city: true, logoUrl: true, phone: true, email: true },
      });
      if (!school) return res.status(404).json({ error: 'Établissement introuvable' });
      res.json(school);
    } catch (err) {
      next(err);
    }
  });

  // ------------------------------------------------------------------
  // API authentifiée (multi-tenant + audit)
  // ------------------------------------------------------------------
  const api = express.Router();
  api.use(authenticate);
  api.use(auditLogger);

  api.use('/schools', schoolsRoutes);
  api.use('/academics', academicsRoutes);
  api.use('/teachers', teachersRoutes);
  api.use('/students', studentsRoutes);
  api.use('/guardians', guardiansRoutes);
  api.use('/enrollment', enrollmentRoutes);
  // Modules soumis à la formule d'abonnement (voir config/plans.ts).
  api.use('/finance', requireFeature('finance'), financeRoutes);
  api.use('/attendance', attendanceRoutes);
  api.use('/grades', gradesRoutes);
  api.use('/timetable', requireFeature('timetable'), timetableRoutes);
  api.use('/planning', planningRoutes);
  api.use('/services', requireFeature('services'), servicesRoutes);
  api.use('/welfare', welfareRoutes);
  api.use('/hr', requireFeature('hr'), hrRoutes);
  api.use('/comms', commsRoutes);
  api.use('/dashboard', dashboardRoutes);
  api.use('/reports', reportsRoutes);
  api.use('/ai', requireFeature('ai'), aiRoutes);
  api.use('/portal', portalRoutes);
  api.use('/platform', platformRoutes);
  api.use('/audit', auditRoutes);
  api.use('/subscription', subscriptionRoutes);

  v1.use(api);
  app.use('/api/v1', v1);
  app.use('/api/backend', v1);

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
};
