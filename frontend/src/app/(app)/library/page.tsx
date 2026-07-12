'use client';

// Bibliothèque : catalogue, emprunts, retours et amendes.

import { useCallback, useEffect, useState } from 'react';
import { Plus, Undo2 } from 'lucide-react';
import { api, authStore } from '@/lib/api';
import { Card, CardHeader, DataTable, Field, Modal, PageHeader, Spinner, StatusBadge } from '@/components/ui';
import { formatDate, formatMoney } from '@/lib/format';

export default function LibraryPage() {
  const [books, setBooks] = useState<any>(null);
  const [loans, setLoans] = useState<any[] | null>(null);
  const [modal, setModal] = useState<'book' | 'loan' | null>(null);
  const [students, setStudents] = useState<any[]>([]);
  const [form, setForm] = useState<any>({});
  const [error, setError] = useState('');
  const currency = authStore.school?.currency ?? 'XOF';

  const load = useCallback(() => {
    api('/services/library/books?pageSize=100').then(setBooks);
    api('/services/library/loans').then(setLoans);
  }, []);
  useEffect(load, [load]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      if (modal === 'book') {
        await api('/services/library/books', {
          method: 'POST',
          body: JSON.stringify({ ...form, copies: form.copies ? parseInt(form.copies, 10) : 1 }),
        });
      } else {
        await api('/services/library/loans', { method: 'POST', body: JSON.stringify(form) });
      }
      setModal(null);
      setForm({});
      load();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const returnBook = async (id: string) => {
    await api(`/services/library/loans/${id}/return`, { method: 'POST', body: JSON.stringify({}) });
    load();
  };

  return (
    <div className="animate-fade-in-up">
      <PageHeader
        title="Bibliothèque"
        actions={
          <>
            <button className="btn-secondary" onClick={async () => {
              setForm({ dueAt: new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10) });
              setModal('loan');
              const s = await api('/students?pageSize=100');
              setStudents(s.items);
            }}><Plus size={16} /> Emprunt</button>
            <button className="btn-primary" onClick={() => { setForm({}); setModal('book'); }}><Plus size={16} /> Livre</button>
          </>
        }
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Catalogue" subtitle={books ? `${books.total} titres` : undefined} />
          {!books ? <Spinner /> : (
            <DataTable
              columns={[
                { key: 'title', header: 'Titre', render: (b: any) => <span className="font-medium">{b.title}</span> },
                { key: 'author', header: 'Auteur', render: (b: any) => b.author ?? '—' },
                { key: 'available', header: 'Dispo', render: (b: any) => <span className="tabular-nums">{b.available}/{b.copies}</span> },
              ]}
              rows={books.items}
              emptyLabel="Catalogue vide"
            />
          )}
        </Card>
        <Card>
          <CardHeader title="Emprunts" />
          {!loans ? <Spinner /> : (
            <DataTable
              columns={[
                { key: 'book', header: 'Livre', render: (l: any) => <span className="font-medium">{l.book.title}</span> },
                { key: 'student', header: 'Élève', render: (l: any) => `${l.student.lastName} ${l.student.firstName}` },
                { key: 'dueAt', header: 'Retour prévu', render: (l: any) => formatDate(l.dueAt) },
                { key: 'status', header: 'Statut', render: (l: any) => <StatusBadge status={l.status} /> },
                { key: 'fine', header: 'Amende', render: (l: any) => (l.fine ? <span className="tabular-nums text-red-600">{formatMoney(l.fine, currency)}</span> : '—') },
                {
                  key: 'actions', header: '',
                  render: (l: any) => l.status === 'ONGOING' ? (
                    <button className="btn-secondary !px-2.5 !py-1.5 text-xs" onClick={() => returnBook(l.id)}>
                      <Undo2 size={13} /> Retour
                    </button>
                  ) : null,
                },
              ]}
              rows={loans}
              emptyLabel="Aucun emprunt"
            />
          )}
        </Card>
      </div>

      <Modal open={modal === 'book'} onClose={() => setModal(null)} title="Nouveau livre">
        <form onSubmit={submit} className="space-y-4">
          <Field label="Titre" required><input required className="input" value={form.title ?? ''} onChange={(e) => setForm({ ...form, title: e.target.value })} /></Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Auteur"><input className="input" value={form.author ?? ''} onChange={(e) => setForm({ ...form, author: e.target.value })} /></Field>
            <Field label="Exemplaires"><input type="number" min={1} className="input" value={form.copies ?? ''} onChange={(e) => setForm({ ...form, copies: e.target.value })} placeholder="1" /></Field>
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <button type="submit" className="btn-primary w-full">Ajouter</button>
        </form>
      </Modal>

      <Modal open={modal === 'loan'} onClose={() => setModal(null)} title="Nouvel emprunt">
        <form onSubmit={submit} className="space-y-4">
          <Field label="Livre" required>
            <select required className="input" value={form.bookId ?? ''} onChange={(e) => setForm({ ...form, bookId: e.target.value })}>
              <option value="">Choisir…</option>
              {books?.items.filter((b: any) => b.available > 0).map((b: any) => (
                <option key={b.id} value={b.id}>{b.title} ({b.available} dispo)</option>
              ))}
            </select>
          </Field>
          <Field label="Élève" required>
            <select required className="input" value={form.studentId ?? ''} onChange={(e) => setForm({ ...form, studentId: e.target.value })}>
              <option value="">Choisir…</option>
              {students.map((s: any) => <option key={s.id} value={s.id}>{s.lastName} {s.firstName}</option>)}
            </select>
          </Field>
          <Field label="Date de retour prévue" required>
            <input type="date" required className="input" value={form.dueAt ?? ''} onChange={(e) => setForm({ ...form, dueAt: e.target.value })} />
          </Field>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <button type="submit" className="btn-primary w-full">Enregistrer l&apos;emprunt</button>
        </form>
      </Modal>
    </div>
  );
}
