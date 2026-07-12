// Tableau de bord temps réel + analytique (tendances, comparaisons).

import { Router } from 'express';
import { prisma } from '../../config/db';
import { requirePermission, requireTenant } from '../../middleware/auth.middleware';

const router = Router();

const startOfDay = (d = new Date()) => new Date(d.toISOString().slice(0, 10));
const startOfMonth = (d = new Date()) => new Date(d.getFullYear(), d.getMonth(), 1);
const startOfYear = (d = new Date()) => new Date(d.getFullYear(), 0, 1);

/** Vue d'ensemble : tous les indicateurs du tableau de bord principal. */
router.get('/overview', requireTenant, requirePermission('dashboard', 'read'), async (req, res, next) => {
  try {
    const schoolId = req.schoolId!;
    const today = startOfDay();
    const monthStart = startOfMonth();
    const yearStart = startOfYear();
    const dow = ((new Date().getDay() + 6) % 7) + 1; // 1 = lundi

    const [
      students,
      teachers,
      classes,
      guardians,
      attendanceToday,
      paymentsMonth,
      paymentsPending,
      expensesMonth,
      incomesMonth,
      paymentsYear,
      expensesYear,
      incomesYear,
      todaySlots,
      upcomingEvents,
      announcements,
      pendingPreRegs,
    ] = await Promise.all([
      prisma.student.count({ where: { schoolId, status: 'ACTIVE' } }),
      prisma.teacher.count({ where: { schoolId, status: 'ACTIVE' } }),
      prisma.schoolClass.count({ where: { schoolId, academicYear: { status: 'ACTIVE' } } }),
      prisma.guardian.count({ where: { schoolId } }),
      prisma.attendance.groupBy({
        by: ['status'],
        where: { schoolId, date: today, studentId: { not: null } },
        _count: true,
      }),
      prisma.payment.aggregate({
        where: { schoolId, status: 'COMPLETED', paidAt: { gte: monthStart } },
        _sum: { amount: true },
      }),
      prisma.invoice.aggregate({
        where: { schoolId, status: { in: ['SENT', 'PARTIALLY_PAID', 'OVERDUE'] } },
        _sum: { total: true, paid: true },
      }),
      prisma.expense.aggregate({
        where: { schoolId, date: { gte: monthStart } },
        _sum: { amount: true },
      }),
      prisma.income.aggregate({
        where: { schoolId, date: { gte: monthStart } },
        _sum: { amount: true },
      }),
      prisma.payment.aggregate({
        where: { schoolId, status: 'COMPLETED', paidAt: { gte: yearStart } },
        _sum: { amount: true },
      }),
      prisma.expense.aggregate({
        where: { schoolId, date: { gte: yearStart } },
        _sum: { amount: true },
      }),
      prisma.income.aggregate({
        where: { schoolId, date: { gte: yearStart } },
        _sum: { amount: true },
      }),
      prisma.timetableSlot.findMany({
        where: { schoolId, dayOfWeek: dow },
        include: {
          subject: { select: { name: true } },
          class: { select: { name: true } },
          teacher: { select: { firstName: true, lastName: true } },
          classroom: { select: { name: true } },
        },
        orderBy: { startTime: 'asc' },
        take: 20,
      }),
      prisma.schoolEvent.findMany({
        where: { schoolId, startDate: { gte: today } },
        orderBy: { startDate: 'asc' },
        take: 5,
      }),
      prisma.announcement.findMany({
        where: { schoolId },
        orderBy: [{ pinned: 'desc' }, { createdAt: 'desc' }],
        take: 5,
      }),
      prisma.preRegistration.count({ where: { schoolId, status: 'PENDING' } }),
    ]);

    const att = Object.fromEntries(attendanceToday.map((a) => [a.status, a._count]));
    const receivedMonth = (paymentsMonth._sum.amount ?? 0) + (incomesMonth._sum.amount ?? 0);
    const receivedYear = (paymentsYear._sum.amount ?? 0) + (incomesYear._sum.amount ?? 0);

    res.json({
      counts: { students, teachers, classes, guardians, pendingPreRegistrations: pendingPreRegs },
      attendanceToday: {
        present: att.PRESENT ?? 0,
        absent: att.ABSENT ?? 0,
        late: att.LATE ?? 0,
        excused: att.EXCUSED ?? 0,
      },
      finance: {
        month: {
          received: receivedMonth,
          expenses: expensesMonth._sum.amount ?? 0,
          balance: receivedMonth - (expensesMonth._sum.amount ?? 0),
        },
        year: {
          received: receivedYear,
          expenses: expensesYear._sum.amount ?? 0,
          balance: receivedYear - (expensesYear._sum.amount ?? 0),
        },
        pendingInvoices:
          (paymentsPending._sum.total ?? 0) - (paymentsPending._sum.paid ?? 0),
      },
      todayTimetable: todaySlots,
      upcomingEvents,
      announcements,
    });
  } catch (err) {
    next(err);
  }
});

/** Séries mensuelles (12 derniers mois) : paiements, dépenses, présences. */
router.get('/trends', requireTenant, requirePermission('dashboard', 'read'), async (req, res, next) => {
  try {
    const schoolId = req.schoolId!;
    const months: { key: string; label: string; start: Date; end: Date }[] = [];
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
      const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
      months.push({
        key: `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}`,
        label: start.toLocaleDateString('fr-FR', { month: 'short' }),
        start,
        end,
      });
    }

    const [payments, expenses, attendance, enrollments] = await Promise.all([
      prisma.payment.findMany({
        where: { schoolId, status: 'COMPLETED', paidAt: { gte: months[0].start } },
        select: { amount: true, paidAt: true },
      }),
      prisma.expense.findMany({
        where: { schoolId, date: { gte: months[0].start } },
        select: { amount: true, date: true },
      }),
      prisma.attendance.findMany({
        where: { schoolId, studentId: { not: null }, date: { gte: months[0].start } },
        select: { status: true, date: true },
      }),
      prisma.enrollment.findMany({
        where: { schoolId },
        select: { enrolledAt: true },
      }),
    ]);

    const series = months.map((m) => {
      const monthPayments = payments
        .filter((p) => p.paidAt >= m.start && p.paidAt < m.end)
        .reduce((sum, p) => sum + p.amount, 0);
      const monthExpenses = expenses
        .filter((e) => e.date >= m.start && e.date < m.end)
        .reduce((sum, e) => sum + e.amount, 0);
      const monthAtt = attendance.filter((a) => a.date >= m.start && a.date < m.end);
      const presents = monthAtt.filter((a) => a.status === 'PRESENT' || a.status === 'LATE').length;
      return {
        month: m.key,
        label: m.label,
        payments: monthPayments,
        expenses: monthExpenses,
        presenceRate: monthAtt.length ? Math.round((presents / monthAtt.length) * 1000) / 10 : null,
        enrollments: enrollments.filter((e) => e.enrolledAt >= m.start && e.enrolledAt < m.end).length,
      };
    });
    res.json(series);
  } catch (err) {
    next(err);
  }
});

/** Comparaison entre années scolaires : effectifs, réussite, encaissements. */
router.get('/year-comparison', requireTenant, requirePermission('dashboard', 'read'), async (req, res, next) => {
  try {
    const schoolId = req.schoolId!;
    const years = await prisma.academicYear.findMany({
      where: { schoolId },
      orderBy: { startDate: 'asc' },
      include: { terms: { select: { id: true } } },
    });
    const rows = await Promise.all(
      years.map(async (year) => {
        const termIds = year.terms.map((t) => t.id);
        const [enrollments, cards, payments] = await Promise.all([
          prisma.enrollment.count({ where: { academicYearId: year.id } }),
          prisma.reportCard.findMany({
            where: { schoolId, termId: { in: termIds.length ? termIds : ['-'] } },
            select: { average: true },
          }),
          prisma.payment.aggregate({
            where: {
              schoolId,
              status: 'COMPLETED',
              paidAt: { gte: year.startDate, lte: year.endDate },
            },
            _sum: { amount: true },
          }),
        ]);
        const passed = cards.filter((c) => c.average >= 10).length;
        return {
          year: year.name,
          status: year.status,
          enrollments,
          averageOfAverages: cards.length
            ? Math.round((cards.reduce((s, c) => s + c.average, 0) / cards.length) * 100) / 100
            : null,
          successRate: cards.length ? Math.round((passed / cards.length) * 1000) / 10 : null,
          collected: payments._sum.amount ?? 0,
        };
      }),
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

export default router;
