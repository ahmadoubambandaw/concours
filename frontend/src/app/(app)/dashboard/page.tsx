'use client';

// Tableau de bord principal : indicateurs temps réel, graphiques,
// emploi du temps du jour, calendrier et annonces.

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  AlertTriangle, ArrowDownRight, ArrowUpRight, CalendarDays, ClipboardCheck,
  GraduationCap, Megaphone, School, Users, Wallet,
} from 'lucide-react';
import { api, authStore } from '@/lib/api';
import { Card, CardHeader, EmptyState, PageHeader, Spinner } from '@/components/ui';
import { FinanceTrendChart, PresenceTrendChart, type TrendPoint } from '@/components/charts';
import { formatDate, formatMoney } from '@/lib/format';

const StatCard = ({
  icon: Icon,
  label,
  value,
  sub,
  tone,
}: {
  icon: any;
  label: string;
  value: string | number;
  sub?: string;
  tone?: 'good' | 'bad';
}) => (
  <Card className="p-4">
    <div className="flex items-center justify-between">
      <p className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>{label}</p>
      <Icon size={16} className="text-brand-600" />
    </div>
    <p className={`mt-2 text-2xl font-bold tabular-nums ${tone === 'good' ? 'text-emerald-600 dark:text-emerald-400' : tone === 'bad' ? 'text-red-600 dark:text-red-400' : ''}`}>
      {value}
    </p>
    {sub && <p className="mt-0.5 text-xs" style={{ color: 'var(--text-muted)' }}>{sub}</p>}
  </Card>
);

export default function DashboardPage() {
  const [overview, setOverview] = useState<any>(null);
  const [trends, setTrends] = useState<TrendPoint[]>([]);
  const [error, setError] = useState('');
  const currency = authStore.school?.currency ?? 'XOF';

  useEffect(() => {
    Promise.all([api('/dashboard/overview'), api('/dashboard/trends')])
      .then(([o, t]) => {
        setOverview(o);
        setTrends(t);
      })
      .catch((e) => setError(e.message));
  }, []);

  if (error) return <EmptyState title="Impossible de charger le tableau de bord" hint={error} />;
  if (!overview) return <Spinner />;

  const { counts, attendanceToday, finance, todayTimetable, upcomingEvents, announcements } = overview;
  const attTotal =
    attendanceToday.present + attendanceToday.absent + attendanceToday.late + attendanceToday.excused;

  return (
    <div className="animate-fade-in-up">
      <PageHeader
        title="Tableau de bord"
        subtitle={new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
      />

      {/* Effectifs */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard icon={Users} label="Élèves" value={counts.students} />
        <StatCard icon={GraduationCap} label="Enseignants" value={counts.teachers} />
        <StatCard icon={School} label="Classes" value={counts.classes} />
        <StatCard icon={Users} label="Parents" value={counts.guardians} />
      </div>

      {/* Présences du jour + finances */}
      <div className="mt-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          icon={ClipboardCheck}
          label="Présents aujourd'hui"
          value={attendanceToday.present}
          sub={attTotal ? `${attendanceToday.absent} absents · ${attendanceToday.late} retards` : 'Appel non fait'}
          tone="good"
        />
        <StatCard
          icon={ArrowUpRight}
          label="Encaissé ce mois"
          value={formatMoney(finance.month.received, currency)}
          tone="good"
        />
        <StatCard
          icon={ArrowDownRight}
          label="Dépenses ce mois"
          value={formatMoney(finance.month.expenses, currency)}
        />
        <StatCard
          icon={Wallet}
          label="Impayés"
          value={formatMoney(finance.pendingInvoices, currency)}
          sub={`Solde annuel : ${formatMoney(finance.year.balance, currency)}`}
          tone={finance.pendingInvoices > 0 ? 'bad' : 'good'}
        />
      </div>

      {counts.pendingPreRegistrations > 0 && (
        <Link href="/preregistrations" className="mt-4 flex items-center gap-2 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
          <AlertTriangle size={16} />
          {counts.pendingPreRegistrations} pré-inscription(s) en attente de validation — cliquez pour traiter
        </Link>
      )}

      {/* Graphiques */}
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Encaissements et dépenses" subtitle="12 derniers mois" />
          <div className="p-4">
            <FinanceTrendChart data={trends} currency={currency} />
          </div>
        </Card>
        <Card>
          <CardHeader title="Taux de présence" subtitle="12 derniers mois" />
          <div className="p-4">
            <PresenceTrendChart data={trends} />
          </div>
        </Card>
      </div>

      {/* Emploi du temps du jour + agenda + annonces */}
      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader title="Cours du jour" subtitle={`${todayTimetable.length} créneaux`} />
          <div className="max-h-80 overflow-y-auto p-2">
            {todayTimetable.length === 0 && <EmptyState title="Aucun cours aujourd'hui" />}
            {todayTimetable.map((slot: any) => (
              <div key={slot.id} className="flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-black/[0.025] dark:hover:bg-white/[0.04]">
                <span className="w-20 shrink-0 text-xs font-semibold tabular-nums text-brand-600">
                  {slot.startTime}–{slot.endTime}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{slot.subject.name}</p>
                  <p className="truncate text-xs" style={{ color: 'var(--text-muted)' }}>
                    {slot.class.name} · {slot.teacher.firstName} {slot.teacher.lastName}
                    {slot.classroom ? ` · ${slot.classroom.name}` : ''}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <CardHeader title="Calendrier scolaire" action={<CalendarDays size={16} style={{ color: 'var(--text-muted)' }} />} />
          <div className="p-2">
            {upcomingEvents.length === 0 && <EmptyState title="Aucun événement à venir" />}
            {upcomingEvents.map((ev: any) => (
              <div key={ev.id} className="rounded-lg px-3 py-2.5 hover:bg-black/[0.025] dark:hover:bg-white/[0.04]">
                <p className="text-sm font-medium">{ev.title}</p>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  {formatDate(ev.startDate)}{ev.endDate ? ` → ${formatDate(ev.endDate)}` : ''}
                </p>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <CardHeader title="Annonces" action={<Megaphone size={16} style={{ color: 'var(--text-muted)' }} />} />
          <div className="p-2">
            {announcements.length === 0 && <EmptyState title="Aucune annonce" />}
            {announcements.map((a: any) => (
              <div key={a.id} className="rounded-lg px-3 py-2.5 hover:bg-black/[0.025] dark:hover:bg-white/[0.04]">
                <p className="text-sm font-medium">{a.title}</p>
                <p className="mt-0.5 line-clamp-2 text-xs" style={{ color: 'var(--text-secondary)' }}>{a.body}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
