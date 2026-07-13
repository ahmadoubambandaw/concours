// Authentification : inscription d'un établissement, connexion (avec 2FA),
// rotation des refresh tokens, gestion du profil et activation du TOTP.

import { Router } from 'express';
import { z } from 'zod';
import { authenticator } from 'otplib';
import QRCode from 'qrcode';
import rateLimit from 'express-rate-limit';
import { prisma } from '../../config/db';
import { env } from '../../config/env';
import { ApiError } from '../../utils/errors';
import { parseBody } from '../../utils/validate';
import { hashPassword, verifyPassword } from '../../utils/password';
import {
  generateRefreshToken,
  hashToken,
  signAccessToken,
} from '../../utils/jwt';
import { authenticate } from '../../middleware/auth.middleware';

const router = Router();

// Anti brute-force sur les routes sensibles.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Trop de tentatives, réessayez dans 15 minutes' },
});

const issueTokens = async (userId: string, schoolId: string | null, role: any, req: any) => {
  const accessToken = signAccessToken({ sub: userId, schoolId, role });
  const refreshToken = generateRefreshToken();
  const expiresAt = new Date(Date.now() + env.jwt.refreshTtlDays * 24 * 3600 * 1000);
  await prisma.refreshToken.create({
    data: {
      userId,
      tokenHash: hashToken(refreshToken),
      expiresAt,
      userAgent: req.headers['user-agent']?.slice(0, 250),
      ip: req.ip,
    },
  });
  return { accessToken, refreshToken };
};

const sanitizeUser = (user: any) => {
  const { password, twoFactorSecret, ...rest } = user;
  return rest;
};

// ------------------------------------------------------------
// POST /auth/register-school — création d'un nouvel établissement
// (self-service SaaS : l'école + son admin, essai de 30 jours)
// ------------------------------------------------------------
const registerSchema = z.object({
  schoolName: z.string().min(2),
  schoolCode: z
    .string()
    .min(2)
    .max(10)
    .regex(/^[a-zA-Z0-9-]+$/, 'Lettres, chiffres et tirets uniquement'),
  schoolType: z.enum(['MATERNELLE', 'PRIMAIRE', 'COLLEGE', 'LYCEE', 'COMPLEXE']).default('COMPLEXE'),
  country: z.string().length(2).default('SN'),
  city: z.string().optional(),
  phone: z.string().optional(),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8, 'Le mot de passe doit contenir au moins 8 caractères'),
});

router.post('/register-school', loginLimiter, async (req, res, next) => {
  try {
    const data = parseBody(req, registerSchema);
    const code = data.schoolCode.toUpperCase();

    const existing = await prisma.school.findUnique({ where: { code } });
    if (existing) throw ApiError.conflict('Ce code établissement est déjà utilisé');

    // Essai de 30 jours : accès à TOUS les modules (formule Premium) sans
    // limite. À l'expiration, l'établissement retombe automatiquement sur
    // la formule Découverte (gratuite, limitée) tant qu'il n'a pas souscrit
    // — c'est à ce moment que les limites s'appliquent.
    const trialEndsAt = new Date(Date.now() + 30 * 24 * 3600 * 1000);
    const result = await prisma.$transaction(async (tx) => {
      const school = await tx.school.create({
        data: {
          code,
          name: data.schoolName,
          type: data.schoolType,
          country: data.country,
          city: data.city,
          phone: data.phone,
          email: data.email,
          status: 'TRIAL',
          plan: 'PREMIUM',
          planExpiresAt: trialEndsAt,
          trialEndsAt,
        },
      });
      const user = await tx.user.create({
        data: {
          schoolId: school.id,
          email: data.email.toLowerCase(),
          password: await hashPassword(data.password),
          firstName: data.firstName,
          lastName: data.lastName,
          role: 'SCHOOL_ADMIN',
        },
      });
      // Année scolaire par défaut pour démarrer immédiatement.
      const now = new Date();
      const startYear = now.getMonth() >= 8 ? now.getFullYear() : now.getFullYear() - 1;
      const year = await tx.academicYear.create({
        data: {
          schoolId: school.id,
          name: `${startYear}-${startYear + 1}`,
          startDate: new Date(startYear, 9, 1),
          endDate: new Date(startYear + 1, 6, 31),
          terms: {
            create: [
              { schoolId: school.id, name: 'Trimestre 1', order: 1, startDate: new Date(startYear, 9, 1), endDate: new Date(startYear, 11, 31) },
              { schoolId: school.id, name: 'Trimestre 2', order: 2, startDate: new Date(startYear + 1, 0, 1), endDate: new Date(startYear + 1, 2, 31) },
              { schoolId: school.id, name: 'Trimestre 3', order: 3, startDate: new Date(startYear + 1, 3, 1), endDate: new Date(startYear + 1, 6, 31) },
            ],
          },
        },
      });
      return { school, user, year };
    });

    const tokens = await issueTokens(result.user.id, result.school.id, result.user.role, req);
    res.status(201).json({
      school: result.school,
      user: sanitizeUser(result.user),
      ...tokens,
    });
  } catch (err) {
    next(err);
  }
});

// ------------------------------------------------------------
// POST /auth/login — email + mot de passe (+ code TOTP si 2FA active)
// ------------------------------------------------------------
const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  schoolCode: z.string().optional(), // désambiguïse un email présent dans plusieurs écoles
  totpCode: z.string().optional(),
});

router.post('/login', loginLimiter, async (req, res, next) => {
  try {
    const data = parseBody(req, loginSchema);
    const email = data.email.toLowerCase();

    let school = null;
    if (data.schoolCode) {
      school = await prisma.school.findUnique({ where: { code: data.schoolCode.toUpperCase() } });
      if (!school) throw ApiError.unauthorized('Identifiants invalides');
    }

    const candidates = await prisma.user.findMany({
      where: { email, ...(school ? { schoolId: school.id } : {}) },
      take: 2,
    });
    if (candidates.length > 1) {
      throw ApiError.badRequest(
        'Cet email existe dans plusieurs établissements : précisez le code établissement',
      );
    }
    const user = candidates[0];
    if (!user) throw ApiError.unauthorized('Identifiants invalides');
    if (user.status === 'LOCKED') {
      throw ApiError.forbidden('Compte verrouillé après trop de tentatives — contactez votre administrateur');
    }
    if (user.status !== 'ACTIVE') throw ApiError.forbidden('Compte désactivé');

    const valid = await verifyPassword(data.password, user.password);
    if (!valid) {
      const failedLogins = user.failedLogins + 1;
      await prisma.user.update({
        where: { id: user.id },
        data: { failedLogins, ...(failedLogins >= 10 ? { status: 'LOCKED' } : {}) },
      });
      throw ApiError.unauthorized('Identifiants invalides');
    }

    if (user.twoFactorEnabled) {
      if (!data.totpCode) {
        // Étape intermédiaire : le client doit renvoyer le code TOTP.
        return res.json({ requiresTwoFactor: true });
      }
      const okTotp = authenticator.verify({
        token: data.totpCode,
        secret: user.twoFactorSecret ?? '',
      });
      if (!okTotp) throw ApiError.unauthorized('Code de vérification invalide');
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { failedLogins: 0, lastLoginAt: new Date() },
    });

    const tokens = await issueTokens(user.id, user.schoolId, user.role, req);
    const schoolInfo = user.schoolId
      ? await prisma.school.findUnique({ where: { id: user.schoolId } })
      : null;
    res.json({ user: sanitizeUser(user), school: schoolInfo, ...tokens });
  } catch (err) {
    next(err);
  }
});

// ------------------------------------------------------------
// POST /auth/refresh — rotation du refresh token
// ------------------------------------------------------------
router.post('/refresh', async (req, res, next) => {
  try {
    const { refreshToken } = parseBody(req, z.object({ refreshToken: z.string().min(10) }));
    const stored = await prisma.refreshToken.findUnique({
      where: { tokenHash: hashToken(refreshToken) },
      include: { user: true },
    });
    if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
      throw ApiError.unauthorized('Session expirée, veuillez vous reconnecter');
    }
    if (stored.user.status !== 'ACTIVE') throw ApiError.forbidden('Compte désactivé');

    // Rotation : l'ancien token est révoqué, un nouveau est émis.
    await prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    });
    const tokens = await issueTokens(stored.user.id, stored.user.schoolId, stored.user.role, req);
    res.json(tokens);
  } catch (err) {
    next(err);
  }
});

// ------------------------------------------------------------
// POST /auth/logout — révoque le refresh token courant
// ------------------------------------------------------------
router.post('/logout', async (req, res, next) => {
  try {
    const { refreshToken } = parseBody(req, z.object({ refreshToken: z.string().min(10) }));
    await prisma.refreshToken.updateMany({
      where: { tokenHash: hashToken(refreshToken), revokedAt: null },
      data: { revokedAt: new Date() },
    });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// ------------------------------------------------------------
// Routes authentifiées : profil, sessions, 2FA
// ------------------------------------------------------------
router.get('/me', authenticate, async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      include: { school: true },
    });
    if (!user) throw ApiError.notFound();
    res.json(sanitizeUser(user));
  } catch (err) {
    next(err);
  }
});

router.patch('/me', authenticate, async (req, res, next) => {
  try {
    const data = parseBody(
      req,
      z.object({
        firstName: z.string().min(1).optional(),
        lastName: z.string().min(1).optional(),
        phone: z.string().optional(),
        avatarUrl: z.string().url().optional(),
      }),
    );
    const user = await prisma.user.update({ where: { id: req.user!.id }, data });
    res.json(sanitizeUser(user));
  } catch (err) {
    next(err);
  }
});

router.post('/change-password', authenticate, async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = parseBody(
      req,
      z.object({ currentPassword: z.string(), newPassword: z.string().min(8) }),
    );
    const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
    if (!user || !(await verifyPassword(currentPassword, user.password))) {
      throw ApiError.unauthorized('Mot de passe actuel incorrect');
    }
    await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: { password: await hashPassword(newPassword) },
      }),
      // Toute modification de mot de passe révoque les autres sessions.
      prisma.refreshToken.updateMany({
        where: { userId: user.id, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

/** Liste des sessions actives (appareils connectés). */
router.get('/sessions', authenticate, async (req, res, next) => {
  try {
    const sessions = await prisma.refreshToken.findMany({
      where: { userId: req.user!.id, revokedAt: null, expiresAt: { gt: new Date() } },
      select: { id: true, userAgent: true, ip: true, createdAt: true, expiresAt: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json(sessions);
  } catch (err) {
    next(err);
  }
});

router.delete('/sessions/:id', authenticate, async (req, res, next) => {
  try {
    await prisma.refreshToken.updateMany({
      where: { id: req.params.id, userId: req.user!.id },
      data: { revokedAt: new Date() },
    });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// --- Double authentification (TOTP compatible Google Authenticator) ---

/** Étape 1 : génère un secret et un QR code à scanner. */
router.post('/2fa/setup', authenticate, async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
    if (!user) throw ApiError.notFound();
    if (user.twoFactorEnabled) throw ApiError.conflict('La 2FA est déjà activée');

    const secret = authenticator.generateSecret();
    await prisma.user.update({ where: { id: user.id }, data: { twoFactorSecret: secret } });

    const otpauth = authenticator.keyuri(user.email, 'Scolaris', secret);
    const qrCodeDataUrl = await QRCode.toDataURL(otpauth);
    res.json({ secret, qrCodeDataUrl });
  } catch (err) {
    next(err);
  }
});

/** Étape 2 : vérifie un premier code et active la 2FA. */
router.post('/2fa/enable', authenticate, async (req, res, next) => {
  try {
    const { totpCode } = parseBody(req, z.object({ totpCode: z.string().length(6) }));
    const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
    if (!user?.twoFactorSecret) throw ApiError.badRequest('Lancez d\'abord la configuration 2FA');
    if (!authenticator.verify({ token: totpCode, secret: user.twoFactorSecret })) {
      throw ApiError.badRequest('Code invalide');
    }
    await prisma.user.update({ where: { id: user.id }, data: { twoFactorEnabled: true } });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

router.post('/2fa/disable', authenticate, async (req, res, next) => {
  try {
    const { password } = parseBody(req, z.object({ password: z.string() }));
    const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
    if (!user || !(await verifyPassword(password, user.password))) {
      throw ApiError.unauthorized('Mot de passe incorrect');
    }
    await prisma.user.update({
      where: { id: user.id },
      data: { twoFactorEnabled: false, twoFactorSecret: null },
    });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

export default router;
