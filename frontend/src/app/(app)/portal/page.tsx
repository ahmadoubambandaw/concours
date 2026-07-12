'use client';

// Portails Parent / Élève / Enseignant : vue adaptée au rôle connecté.

import { useEffect, useState } from 'react';
import { Download } from 'lucide-react';
import { api, apiDownload, authStore } from '@/lib/api';
import { Badge, Card, CardHeader, DataTable, EmptyState, PageHeader, Spinner, StatusBadge } from '@/components/ui';
import { DAYS_FR, formatDate, formatMoney } from '@/lib/format';

const ChildView = ({ child, currency }: { child: any; currency: string }) => (
  <div className="mb-6">
    <h2 className="mb-3 text-base font-semibold">
      {child.student.firstName} {child.student.lastName}
      <span className="ml-2 text-sm font-normal" style={{ color: 'var(--text-muted)' }}>
        {child.student.class?.name ?? 'Non inscrit'} · {child.student.matricule}
      </span>
    </h2>
    <div className="grid gap-4 lg:grid-cols-3">
      <Card>
        <CardHeader title="Bulletins publiés" />
        <div className="p-2">
          {child.reportCards.length === 0 && <EmptyState title="Aucun bulletin publié" />}
          {child.reportCards.map((rc: any) => (
            <div key={rc.id} className="flex items-center justify-between rounded-lg px-3 py-2">
              <div>
                <p className="text-sm font-medium">{rc.term.name} — {rc.term.academicYear.name}</p>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  {rc.average.toFixed(2)}/20 · Rang {rc.rank}/{rc.classSize} · {rc.mention}
                </p>
              </div>
              <button className="btn-secondary !px-2 !py-1.5" onClick={() => apiDownload(`/grades/report-cards/${rc.id}/pdf`, 'bulletin.pdf')}>
                <Download size={13} />
              </button>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <CardHeader title="Paiements" />
        <div className="p-2">
          {child.invoices.length === 0 && <EmptyState title="Aucune facture" />}
          {child.invoices.map((inv: any) => (
            <div key={inv.id} className="flex items-center justify-between rounded-lg px-3 py-2">
              <div>
                <p className="text-sm font-medium">{inv.number}</p>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  {formatMoney(inv.paid, currency)} / {formatMoney(inv.total, currency)}
                </p>
              </div>
              <StatusBadge status={inv.status} />
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <CardHeader title="Devoirs à faire" />
        <div className="p-2">
          {child.homework.length === 0 && <EmptyState title="Aucun devoir" />}
          {child.homework.map((h: any) => (
            <div key={h.id} className="rounded-lg px-3 py-2">
              <p className="text-sm font-medium">{h.subject.name} — {h.title}</p>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Pour le {formatDate(h.dueDate)}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>

    {child.timetable.length > 0 && (
      <Card className="mt-4">
        <CardHeader title="Emploi du temps" />
        <div className="grid gap-2 p-3 md:grid-cols-5">
          {[1, 2, 3, 4, 5].map((day) => (
            <div key={day}>
              <p className="mb-1 text-center text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>{DAYS_FR[day]}</p>
              {child.timetable.filter((s: any) => s.dayOfWeek === day).map((s: any) => (
                <div key={s.id} className="mb-1 rounded p-1.5 text-xs" style={{ background: 'var(--surface-2)' }}>
                  <span className="font-medium tabular-nums">{s.startTime}</span> {s.subject.name}
                </div>
              ))}
            </div>
          ))}
        </div>
      </Card>
    )}
  </div>
);

export default function PortalPage() {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState('');
  const user = authStore.user;
  const currency = authStore.school?.currency ?? 'XOF';

  useEffect(() => {
    if (!user) return;
    const path = user.role === 'PARENT' ? '/portal/parent' : user.role === 'STUDENT' ? '/portal/student' : '/portal/teacher';
    api(path).then(setData).catch((e) => setError(e.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (error) return <EmptyState title="Portail indisponible" hint={error} />;
  if (!data || !user) return <Spinner />;

  if (user.role === 'PARENT') {
    return (
      <div className="animate-fade-in-up">
        <PageHeader title="Portail parent" subtitle={`${data.children.length} enfant(s) suivi(s)`} />
        {data.children.length === 0 ? (
          <EmptyState title="Aucun enfant lié à votre compte" hint="Contactez le secrétariat de l'établissement." />
        ) : (
          data.children.map((child: any) => <ChildView key={child.student.id} child={child} currency={currency} />)
        )}
      </div>
    );
  }

  if (user.role === 'STUDENT') {
    return (
      <div className="animate-fade-in-up">
        <PageHeader title="Mon espace élève" />
        <ChildView child={data} currency={currency} />
      </div>
    );
  }

  // Enseignant
  return (
    <div className="animate-fade-in-up">
      <PageHeader
        title="Portail enseignant"
        subtitle={data.teacher.subjects.map((s: any) => s.name).join(', ')}
      />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Mes classes" />
          <DataTable
            columns={[
              { key: 'name', header: 'Classe', render: (c: any) => <span className="font-medium">{c.name}</span> },
              { key: 'level', header: 'Niveau', render: (c: any) => c.level?.name },
              { key: 'count', header: 'Effectif', render: (c: any) => <span className="tabular-nums">{c._count?.enrollments ?? 0}</span> },
              {
                key: 'main', header: '',
                render: (c: any) => data.mainClasses.some((m: any) => m.id === c.id) ? <Badge color="blue">Prof. principal</Badge> : null,
              },
            ]}
            rows={data.classes}
            emptyLabel="Aucune classe affectée"
          />
        </Card>
        <Card>
          <CardHeader title="Mes dernières évaluations" />
          <DataTable
            columns={[
              { key: 'title', header: 'Titre', render: (a: any) => <span className="font-medium">{a.title}</span> },
              { key: 'class', header: 'Classe', render: (a: any) => a.class.name },
              { key: 'date', header: 'Date', render: (a: any) => formatDate(a.date) },
              { key: 'grades', header: 'Notes saisies', render: (a: any) => <span className="tabular-nums">{a._count.grades}</span> },
            ]}
            rows={data.assessments}
            emptyLabel="Aucune évaluation"
          />
        </Card>
      </div>

      {data.timetable.length > 0 && (
        <Card className="mt-4">
          <CardHeader title="Mon planning" />
          <div className="grid gap-2 p-3 md:grid-cols-5">
            {[1, 2, 3, 4, 5].map((day) => (
              <div key={day}>
                <p className="mb-1 text-center text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>{DAYS_FR[day]}</p>
                {data.timetable.filter((s: any) => s.dayOfWeek === day).map((s: any) => (
                  <div key={s.id} className="mb-1 rounded p-1.5 text-xs" style={{ background: 'var(--surface-2)' }}>
                    <span className="font-medium tabular-nums">{s.startTime}</span> {s.subject.name} · {s.class.name}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
