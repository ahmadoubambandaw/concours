'use client';

// Fiche élève complète : identité + QR code, scolarité, finances,
// présences, bulletins, discipline, santé, parents.

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Download, Plus, UserPlus } from 'lucide-react';
import { api, apiDownload, authStore } from '@/lib/api';
import {
  Avatar, Badge, Card, CardHeader, DataTable, EmptyState, Field, Modal,
  PageHeader, Spinner, StatusBadge,
} from '@/components/ui';
import { formatDate, formatMoney } from '@/lib/format';

const RELATIONS: Record<string, string> = { FATHER: 'Père', MOTHER: 'Mère', TUTOR: 'Tuteur', OTHER: 'Autre' };

export default function StudentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [student, setStudent] = useState<any>(null);
  const [error, setError] = useState('');
  const [showEnroll, setShowEnroll] = useState(false);
  const [showGuardian, setShowGuardian] = useState(false);
  const [classes, setClasses] = useState<any[]>([]);
  const [enrollForm, setEnrollForm] = useState<any>({ classId: '', options: {} });
  const [guardianForm, setGuardianForm] = useState<any>({ relation: 'TUTOR', isPrimary: true, guardian: { firstName: '', lastName: '', phone: '' } });
  const currency = authStore.school?.currency ?? 'XOF';

  const load = useCallback(() => {
    api(`/students/${id}/full`).then(setStudent).catch((e) => setError(e.message));
  }, [id]);
  useEffect(load, [load]);

  const enroll = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api('/enrollment/enrollments', {
        method: 'POST',
        body: JSON.stringify({ studentId: id, ...enrollForm }),
      });
      setShowEnroll(false);
      load();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const addGuardian = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api(`/students/${id}/guardians`, { method: 'POST', body: JSON.stringify(guardianForm) });
      setShowGuardian(false);
      load();
    } catch (err: any) {
      setError(err.message);
    }
  };

  if (error && !student) return <EmptyState title="Erreur" hint={error} />;
  if (!student) return <Spinner />;

  const activeEnrollment = student.enrollments?.find((e: any) => e.status === 'ACTIVE');
  const att = student.attendanceStats ?? {};
  const attTotal = (att.PRESENT ?? 0) + (att.ABSENT ?? 0) + (att.LATE ?? 0) + (att.EXCUSED ?? 0);

  return (
    <div className="animate-fade-in-up">
      <PageHeader
        title={`${student.lastName} ${student.firstName}`}
        subtitle={student.matricule}
        actions={
          <>
            {!activeEnrollment && (
              <button className="btn-primary" onClick={async () => {
                setShowEnroll(true);
                const c = await api('/academics/classes?pageSize=100');
                setClasses(c.items);
              }}>
                <Plus size={16} /> Inscrire dans une classe
              </button>
            )}
            <button className="btn-secondary" onClick={() => { setShowGuardian(true); }}>
              <UserPlus size={16} /> Ajouter un parent
            </button>
          </>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Identité */}
        <Card className="p-5">
          <div className="flex items-center gap-4">
            <Avatar name={`${student.firstName} ${student.lastName}`} photoUrl={student.photoUrl} size={64} />
            <div>
              <p className="font-semibold">{student.lastName} {student.firstName}</p>
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                {student.gender === 'M' ? 'Garçon' : 'Fille'} · né(e) le {formatDate(student.birthDate)}
              </p>
              <div className="mt-1"><StatusBadge status={student.status} /></div>
            </div>
          </div>
          <dl className="mt-5 space-y-2 text-sm">
            <div className="flex justify-between"><dt style={{ color: 'var(--text-muted)' }}>Classe</dt><dd className="font-medium">{activeEnrollment?.class?.name ?? '—'}</dd></div>
            <div className="flex justify-between"><dt style={{ color: 'var(--text-muted)' }}>Année</dt><dd>{activeEnrollment?.academicYear?.name ?? '—'}</dd></div>
            <div className="flex justify-between"><dt style={{ color: 'var(--text-muted)' }}>Lieu de naissance</dt><dd>{student.birthPlace ?? '—'}</dd></div>
            <div className="flex justify-between"><dt style={{ color: 'var(--text-muted)' }}>Adresse</dt><dd>{student.address ?? '—'}</dd></div>
            <div className="flex justify-between"><dt style={{ color: 'var(--text-muted)' }}>Groupe sanguin</dt><dd>{student.bloodType ?? '—'}</dd></div>
            <div className="flex justify-between"><dt style={{ color: 'var(--text-muted)' }}>Allergies</dt><dd>{student.allergies ?? 'Aucune connue'}</dd></div>
          </dl>
          {student.qrCode && (
            <div className="mt-5 flex items-center gap-3 rounded-lg border p-3" style={{ borderColor: 'var(--border)' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={student.qrCode} alt="QR code" className="h-20 w-20 rounded" />
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                QR code du matricule — pointage des présences et carte scolaire.
              </p>
            </div>
          )}
        </Card>

        {/* Finances + présences */}
        <Card className="p-5">
          <h3 className="text-sm font-semibold">Situation financière</h3>
          <div className="mt-4 grid grid-cols-3 gap-3 text-center">
            <div><p className="text-lg font-bold tabular-nums">{formatMoney(student.finance.invoiced, currency)}</p><p className="text-xs" style={{ color: 'var(--text-muted)' }}>Facturé</p></div>
            <div><p className="text-lg font-bold tabular-nums text-emerald-600 dark:text-emerald-400">{formatMoney(student.finance.paid, currency)}</p><p className="text-xs" style={{ color: 'var(--text-muted)' }}>Payé</p></div>
            <div><p className={`text-lg font-bold tabular-nums ${student.finance.due > 0 ? 'text-red-600 dark:text-red-400' : ''}`}>{formatMoney(student.finance.due, currency)}</p><p className="text-xs" style={{ color: 'var(--text-muted)' }}>Reste dû</p></div>
          </div>
          <h3 className="mt-6 text-sm font-semibold">Assiduité</h3>
          {attTotal === 0 ? (
            <p className="mt-2 text-sm" style={{ color: 'var(--text-muted)' }}>Aucun relevé.</p>
          ) : (
            <div className="mt-3 space-y-1.5 text-sm">
              {[['PRESENT', 'Présences'], ['ABSENT', 'Absences'], ['LATE', 'Retards'], ['EXCUSED', 'Excusés']].map(([key, label]) => (
                <div key={key} className="flex items-center justify-between">
                  <span style={{ color: 'var(--text-secondary)' }}>{label}</span>
                  <span className="font-medium tabular-nums">{att[key] ?? 0}</span>
                </div>
              ))}
            </div>
          )}
          <h3 className="mt-6 text-sm font-semibold">Parents / tuteurs</h3>
          <div className="mt-2 space-y-2">
            {student.guardians.length === 0 && <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Aucun parent lié.</p>}
            {student.guardians.map((g: any) => (
              <div key={g.guardianId} className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm" style={{ borderColor: 'var(--border)' }}>
                <div>
                  <p className="font-medium">{g.guardian.firstName} {g.guardian.lastName}</p>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{g.guardian.phone}</p>
                </div>
                <Badge color={g.isPrimary ? 'blue' : 'gray'}>{RELATIONS[g.relation] ?? g.relation}</Badge>
              </div>
            ))}
          </div>
        </Card>

        {/* Bulletins */}
        <Card>
          <CardHeader title="Bulletins" />
          <div className="p-2">
            {student.reportCards.length === 0 && <EmptyState title="Aucun bulletin" />}
            {student.reportCards.map((rc: any) => (
              <div key={rc.id} className="flex items-center justify-between rounded-lg px-3 py-2.5 hover:bg-black/[0.025] dark:hover:bg-white/[0.04]">
                <div>
                  <p className="text-sm font-medium">{rc.term.name}</p>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    Moyenne {rc.average.toFixed(2)}/20 · Rang {rc.rank}/{rc.classSize} · {rc.mention}
                  </p>
                </div>
                <button
                  className="btn-secondary !px-2.5 !py-1.5"
                  onClick={() => apiDownload(`/grades/report-cards/${rc.id}/pdf`, `bulletin-${student.matricule}.pdf`)}
                  title="Télécharger le bulletin PDF"
                >
                  <Download size={14} />
                </button>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Historique paiements + discipline */}
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Derniers paiements" />
          <DataTable
            columns={[
              { key: 'receiptNumber', header: 'Reçu' },
              { key: 'paidAt', header: 'Date', render: (p: any) => formatDate(p.paidAt) },
              { key: 'amount', header: 'Montant', render: (p: any) => <span className="tabular-nums">{formatMoney(p.amount, currency)}</span> },
              { key: 'method', header: 'Mode', render: (p: any) => p.method.replace(/_/g, ' ') },
            ]}
            rows={student.payments}
            emptyLabel="Aucun paiement"
          />
        </Card>
        <Card>
          <CardHeader title="Discipline & santé" />
          <div className="p-2">
            {student.disciplineCases.length === 0 && student.medicalVisits.length === 0 && (
              <EmptyState title="Rien à signaler" />
            )}
            {student.disciplineCases.map((d: any) => (
              <div key={d.id} className="rounded-lg px-3 py-2">
                <p className="text-sm"><Badge color="red">{d.type.replace(/_/g, ' ')}</Badge> <span className="ml-1">{d.description}</span></p>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{formatDate(d.date)}</p>
              </div>
            ))}
            {student.medicalVisits.map((v: any) => (
              <div key={v.id} className="rounded-lg px-3 py-2">
                <p className="text-sm"><Badge color="blue">{v.type}</Badge> <span className="ml-1">{v.diagnosis ?? ''}</span></p>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{formatDate(v.date)}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Modales */}
      <Modal open={showEnroll} onClose={() => setShowEnroll(false)} title="Inscrire dans une classe">
        <form onSubmit={enroll} className="space-y-4">
          <Field label="Classe" required>
            <select required className="input" value={enrollForm.classId} onChange={(e) => setEnrollForm({ ...enrollForm, classId: e.target.value })}>
              <option value="">Choisir…</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>{c.name} ({c._count?.enrollments ?? 0}/{c.capacity})</option>
              ))}
            </select>
          </Field>
          <Field label="Options">
            <div className="flex flex-wrap gap-3 text-sm">
              {[['canteen', 'Cantine'], ['transport', 'Transport'], ['uniform', 'Uniforme'], ['insurance', 'Assurance'], ['library', 'Bibliothèque']].map(([key, label]) => (
                <label key={key} className="flex items-center gap-1.5">
                  <input
                    type="checkbox"
                    checked={enrollForm.options[key] ?? false}
                    onChange={(e) => setEnrollForm({ ...enrollForm, options: { ...enrollForm.options, [key]: e.target.checked } })}
                  />
                  {label}
                </label>
              ))}
            </div>
          </Field>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>La facture des frais applicables sera générée automatiquement.</p>
          <button type="submit" className="btn-primary w-full">Inscrire</button>
        </form>
      </Modal>

      <Modal open={showGuardian} onClose={() => setShowGuardian(false)} title="Ajouter un parent / tuteur">
        <form onSubmit={addGuardian} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Prénom" required>
              <input required className="input" value={guardianForm.guardian.firstName} onChange={(e) => setGuardianForm({ ...guardianForm, guardian: { ...guardianForm.guardian, firstName: e.target.value } })} />
            </Field>
            <Field label="Nom" required>
              <input required className="input" value={guardianForm.guardian.lastName} onChange={(e) => setGuardianForm({ ...guardianForm, guardian: { ...guardianForm.guardian, lastName: e.target.value } })} />
            </Field>
            <Field label="Téléphone" required>
              <input required className="input" value={guardianForm.guardian.phone} onChange={(e) => setGuardianForm({ ...guardianForm, guardian: { ...guardianForm.guardian, phone: e.target.value } })} />
            </Field>
            <Field label="Lien" required>
              <select className="input" value={guardianForm.relation} onChange={(e) => setGuardianForm({ ...guardianForm, relation: e.target.value })}>
                <option value="FATHER">Père</option>
                <option value="MOTHER">Mère</option>
                <option value="TUTOR">Tuteur</option>
                <option value="OTHER">Autre</option>
              </select>
            </Field>
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <button type="submit" className="btn-primary w-full">Ajouter</button>
        </form>
      </Modal>
    </div>
  );
}
