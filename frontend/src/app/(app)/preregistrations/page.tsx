'use client';

// Pré-inscriptions en ligne : validation, rejet, conversion en inscription.

import { useCallback, useEffect, useState } from 'react';
import { Check, X } from 'lucide-react';
import { api, authStore } from '@/lib/api';
import { Card, DataTable, Field, Modal, PageHeader, Spinner, StatusBadge } from '@/components/ui';
import { formatDate } from '@/lib/format';

export default function PreRegistrationsPage() {
  const [data, setData] = useState<any>(null);
  const [status, setStatus] = useState('');
  const [convert, setConvert] = useState<any>(null);
  const [classes, setClasses] = useState<any[]>([]);
  const [classId, setClassId] = useState('');
  const [error, setError] = useState('');
  const school = authStore.school;

  const load = useCallback(() => {
    api(`/enrollment/preregistrations?pageSize=50${status ? `&status=${status}` : ''}`).then(setData);
  }, [status]);
  useEffect(load, [load]);

  const decide = async (id: string, newStatus: 'APPROVED' | 'REJECTED') => {
    await api(`/enrollment/preregistrations/${id}`, { method: 'PATCH', body: JSON.stringify({ status: newStatus }) });
    load();
  };

  const doConvert = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await api(`/enrollment/preregistrations/${convert.id}/convert`, {
        method: 'POST',
        body: JSON.stringify({ classId }),
      });
      setConvert(null);
      load();
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="animate-fade-in-up">
      <PageHeader
        title="Pré-inscriptions"
        subtitle={school ? `Formulaire public : /preinscription/${school.code}` : undefined}
      />
      <div className="mb-4">
        <select className="input max-w-52" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">Tous les statuts</option>
          <option value="PENDING">En attente</option>
          <option value="APPROVED">Approuvées</option>
          <option value="REJECTED">Rejetées</option>
          <option value="CONVERTED">Converties</option>
        </select>
      </div>
      <Card>
        {!data ? (
          <Spinner />
        ) : (
          <DataTable
            columns={[
              { key: 'name', header: 'Candidat', render: (p: any) => <span className="font-medium">{p.lastName} {p.firstName}</span> },
              { key: 'desiredLevel', header: 'Niveau souhaité' },
              { key: 'guardian', header: 'Parent', render: (p: any) => `${p.guardianName} · ${p.guardianPhone}` },
              { key: 'createdAt', header: 'Reçue le', render: (p: any) => formatDate(p.createdAt) },
              { key: 'status', header: 'Statut', render: (p: any) => <StatusBadge status={p.status} /> },
              {
                key: 'actions', header: 'Actions',
                render: (p: any) => (
                  <div className="flex gap-1.5" onClick={(e) => e.stopPropagation()}>
                    {p.status === 'PENDING' && (
                      <>
                        <button className="btn-secondary !p-1.5" title="Approuver" onClick={() => decide(p.id, 'APPROVED')}><Check size={14} className="text-emerald-600" /></button>
                        <button className="btn-secondary !p-1.5" title="Rejeter" onClick={() => decide(p.id, 'REJECTED')}><X size={14} className="text-red-500" /></button>
                      </>
                    )}
                    {p.status === 'APPROVED' && (
                      <button className="btn-primary !px-2.5 !py-1.5 text-xs" onClick={async () => {
                        setConvert(p);
                        const c = await api('/academics/classes?pageSize=100');
                        setClasses(c.items);
                      }}>
                        Inscrire
                      </button>
                    )}
                  </div>
                ),
              },
            ]}
            rows={data.items}
            emptyLabel="Aucune pré-inscription"
          />
        )}
      </Card>

      <Modal open={!!convert} onClose={() => setConvert(null)} title={`Inscrire ${convert?.firstName ?? ''} ${convert?.lastName ?? ''}`}>
        <form onSubmit={doConvert} className="space-y-4">
          <Field label="Classe d'affectation" required>
            <select required className="input" value={classId} onChange={(e) => setClassId(e.target.value)}>
              <option value="">Choisir…</option>
              {classes.map((c) => <option key={c.id} value={c.id}>{c.name} ({c._count?.enrollments ?? 0}/{c.capacity})</option>)}
            </select>
          </Field>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            Crée l&apos;élève (matricule + QR code), le compte parent et l&apos;inscription.
          </p>
          <button type="submit" className="btn-primary w-full">Convertir en inscription</button>
        </form>
      </Modal>
    </div>
  );
}
