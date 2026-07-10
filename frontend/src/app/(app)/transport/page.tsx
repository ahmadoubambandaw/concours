'use client';

// Transport scolaire : bus, itinéraires et élèves affectés.

import { useCallback, useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { api, authStore } from '@/lib/api';
import { Badge, Card, CardHeader, DataTable, Field, Modal, PageHeader, Spinner } from '@/components/ui';
import { formatMoney } from '@/lib/format';

export default function TransportPage() {
  const [buses, setBuses] = useState<any>(null);
  const [routes, setRoutes] = useState<any>(null);
  const [modal, setModal] = useState<'bus' | 'route' | 'assign' | null>(null);
  const [students, setStudents] = useState<any[]>([]);
  const [form, setForm] = useState<any>({});
  const [error, setError] = useState('');
  const currency = authStore.school?.currency ?? 'XOF';

  const load = useCallback(() => {
    api('/services/transport/buses?pageSize=50').then(setBuses);
    api('/services/transport/routes?pageSize=50').then(setRoutes);
  }, []);
  useEffect(load, [load]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      if (modal === 'bus') {
        await api('/services/transport/buses', {
          method: 'POST',
          body: JSON.stringify({ ...form, capacity: form.capacity ? parseInt(form.capacity, 10) : 30 }),
        });
      } else if (modal === 'route') {
        await api('/services/transport/routes', {
          method: 'POST',
          body: JSON.stringify({
            name: form.name,
            busId: form.busId || null,
            monthlyFee: form.monthlyFee ? parseInt(form.monthlyFee, 10) : 0,
            stops: (form.stops ?? '').split(',').map((s: string) => ({ name: s.trim() })).filter((s: any) => s.name),
          }),
        });
      } else {
        await api('/services/transport/assignments', { method: 'POST', body: JSON.stringify(form) });
      }
      setModal(null); setForm({}); load();
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="animate-fade-in-up">
      <PageHeader
        title="Transport"
        actions={
          <>
            <button className="btn-secondary" onClick={() => { setForm({}); setModal('bus'); }}><Plus size={16} /> Bus</button>
            <button className="btn-secondary" onClick={() => { setForm({}); setModal('route'); }}><Plus size={16} /> Itinéraire</button>
            <button className="btn-primary" onClick={async () => {
              setForm({}); setModal('assign');
              const s = await api('/students?pageSize=100');
              setStudents(s.items);
            }}><Plus size={16} /> Affecter un élève</button>
          </>
        }
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Bus" />
          {!buses ? <Spinner /> : (
            <DataTable
              columns={[
                { key: 'name', header: 'Bus', render: (b: any) => <span className="font-medium">{b.name}</span> },
                { key: 'plate', header: 'Immatriculation', render: (b: any) => b.plate ?? '—' },
                { key: 'driverName', header: 'Chauffeur', render: (b: any) => b.driverName ?? '—' },
                { key: 'capacity', header: 'Places', render: (b: any) => <span className="tabular-nums">{b.capacity}</span> },
              ]}
              rows={buses.items}
              emptyLabel="Aucun bus"
            />
          )}
        </Card>
        <Card>
          <CardHeader title="Itinéraires" />
          {!routes ? <Spinner /> : (
            <div className="p-3">
              {routes.items.length === 0 && <p className="py-6 text-center text-sm" style={{ color: 'var(--text-muted)' }}>Aucun itinéraire</p>}
              {routes.items.map((r: any) => (
                <div key={r.id} className="mb-3 rounded-lg border p-3" style={{ borderColor: 'var(--border)' }}>
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold">{r.name}</p>
                    <Badge color="blue">{formatMoney(r.monthlyFee, currency)}/mois</Badge>
                  </div>
                  <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
                    {r.bus?.name ?? 'Sans bus'} · {(r.stops as any[]).map((s) => s.name).join(' → ') || 'Arrêts non définis'}
                  </p>
                  <p className="mt-1 text-xs">{r.students?.length ?? 0} élèves inscrits</p>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <Modal open={modal === 'bus'} onClose={() => setModal(null)} title="Nouveau bus">
        <form onSubmit={submit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nom" required><input required className="input" value={form.name ?? ''} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Bus 1" /></Field>
            <Field label="Immatriculation"><input className="input" value={form.plate ?? ''} onChange={(e) => setForm({ ...form, plate: e.target.value })} /></Field>
            <Field label="Chauffeur"><input className="input" value={form.driverName ?? ''} onChange={(e) => setForm({ ...form, driverName: e.target.value })} /></Field>
            <Field label="Places"><input type="number" className="input" value={form.capacity ?? ''} onChange={(e) => setForm({ ...form, capacity: e.target.value })} placeholder="30" /></Field>
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <button type="submit" className="btn-primary w-full">Créer</button>
        </form>
      </Modal>

      <Modal open={modal === 'route'} onClose={() => setModal(null)} title="Nouvel itinéraire">
        <form onSubmit={submit} className="space-y-4">
          <Field label="Nom" required><input required className="input" value={form.name ?? ''} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ligne Ouakam — Plateau" /></Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Bus">
              <select className="input" value={form.busId ?? ''} onChange={(e) => setForm({ ...form, busId: e.target.value })}>
                <option value="">Aucun</option>
                {buses?.items.map((b: any) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </Field>
            <Field label="Tarif mensuel"><input type="number" className="input" value={form.monthlyFee ?? ''} onChange={(e) => setForm({ ...form, monthlyFee: e.target.value })} /></Field>
          </div>
          <Field label="Arrêts (séparés par des virgules)">
            <input className="input" value={form.stops ?? ''} onChange={(e) => setForm({ ...form, stops: e.target.value })} placeholder="Ouakam, Mermoz, École" />
          </Field>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <button type="submit" className="btn-primary w-full">Créer</button>
        </form>
      </Modal>

      <Modal open={modal === 'assign'} onClose={() => setModal(null)} title="Affecter un élève à un itinéraire">
        <form onSubmit={submit} className="space-y-4">
          <Field label="Élève" required>
            <select required className="input" value={form.studentId ?? ''} onChange={(e) => setForm({ ...form, studentId: e.target.value })}>
              <option value="">Choisir…</option>
              {students.map((s: any) => <option key={s.id} value={s.id}>{s.lastName} {s.firstName}</option>)}
            </select>
          </Field>
          <Field label="Itinéraire" required>
            <select required className="input" value={form.routeId ?? ''} onChange={(e) => setForm({ ...form, routeId: e.target.value })}>
              <option value="">Choisir…</option>
              {routes?.items.map((r: any) => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </Field>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <button type="submit" className="btn-primary w-full">Affecter</button>
        </form>
      </Modal>
    </div>
  );
}
