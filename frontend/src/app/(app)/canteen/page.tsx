'use client';

// Cantine : menus de la semaine et pointage des repas du jour.

import { useCallback, useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { api, authStore } from '@/lib/api';
import { Card, CardHeader, DataTable, Field, Modal, PageHeader, Spinner } from '@/components/ui';
import { formatDate, formatMoney } from '@/lib/format';

export default function CanteenPage() {
  const [menus, setMenus] = useState<any>(null);
  const [meals, setMeals] = useState<any[] | null>(null);
  const [modal, setModal] = useState<'menu' | 'meal' | null>(null);
  const [students, setStudents] = useState<any[]>([]);
  const [form, setForm] = useState<any>({});
  const [error, setError] = useState('');
  const currency = authStore.school?.currency ?? 'XOF';

  const load = useCallback(() => {
    api('/services/canteen/menus?pageSize=14').then(setMenus);
    api('/services/canteen/meals').then(setMeals);
  }, []);
  useEffect(load, [load]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      if (modal === 'menu') {
        await api('/services/canteen/menus', {
          method: 'POST',
          body: JSON.stringify({ ...form, price: form.price ? parseInt(form.price, 10) : 0 }),
        });
      } else {
        await api('/services/canteen/meals', { method: 'POST', body: JSON.stringify(form) });
      }
      setModal(null); setForm({}); load();
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="animate-fade-in-up">
      <PageHeader
        title="Cantine"
        actions={
          <>
            <button className="btn-secondary" onClick={async () => {
              setForm({});
              setModal('meal');
              const s = await api('/students?pageSize=100');
              setStudents(s.items);
            }}><Plus size={16} /> Pointer un repas</button>
            <button className="btn-primary" onClick={() => { setForm({ date: new Date().toISOString().slice(0, 10) }); setModal('menu'); }}>
              <Plus size={16} /> Menu
            </button>
          </>
        }
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Menus" />
          {!menus ? <Spinner /> : (
            <DataTable
              columns={[
                { key: 'date', header: 'Date', render: (m: any) => formatDate(m.date) },
                { key: 'meal', header: 'Menu', render: (m: any) => <span className="font-medium">{m.meal}</span> },
                { key: 'price', header: 'Prix', render: (m: any) => <span className="tabular-nums">{formatMoney(m.price, currency)}</span> },
              ]}
              rows={menus.items}
              emptyLabel="Aucun menu planifié"
            />
          )}
        </Card>
        <Card>
          <CardHeader title="Repas du jour" subtitle={meals ? `${meals.length} élèves servis` : undefined} />
          {!meals ? <Spinner /> : (
            <DataTable
              columns={[
                { key: 'student', header: 'Élève', render: (m: any) => `${m.student.lastName} ${m.student.firstName}` },
                { key: 'paid', header: 'Payé', render: (m: any) => (m.paid ? 'Oui' : 'Non') },
              ]}
              rows={meals}
              emptyLabel="Aucun repas pointé aujourd'hui"
            />
          )}
        </Card>
      </div>

      <Modal open={modal === 'menu'} onClose={() => setModal(null)} title="Nouveau menu">
        <form onSubmit={submit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Date" required><input type="date" required className="input" value={form.date ?? ''} onChange={(e) => setForm({ ...form, date: e.target.value })} /></Field>
            <Field label="Prix"><input type="number" className="input" value={form.price ?? ''} onChange={(e) => setForm({ ...form, price: e.target.value })} /></Field>
          </div>
          <Field label="Menu" required><input required className="input" value={form.meal ?? ''} onChange={(e) => setForm({ ...form, meal: e.target.value })} placeholder="Thiéboudienne…" /></Field>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <button type="submit" className="btn-primary w-full">Enregistrer</button>
        </form>
      </Modal>

      <Modal open={modal === 'meal'} onClose={() => setModal(null)} title="Pointer un repas">
        <form onSubmit={submit} className="space-y-4">
          <Field label="Élève" required>
            <select required className="input" value={form.studentId ?? ''} onChange={(e) => setForm({ ...form, studentId: e.target.value })}>
              <option value="">Choisir…</option>
              {students.map((s: any) => <option key={s.id} value={s.id}>{s.lastName} {s.firstName}</option>)}
            </select>
          </Field>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.paid ?? false} onChange={(e) => setForm({ ...form, paid: e.target.checked })} />
            Repas payé
          </label>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <button type="submit" className="btn-primary w-full">Pointer</button>
        </form>
      </Modal>
    </div>
  );
}
