'use client';

// Paramètres : établissement, années scolaires, grilles de frais,
// utilisateurs & rôles, sécurité (2FA).

import { useCallback, useEffect, useState } from 'react';
import { Plus, ShieldCheck } from 'lucide-react';
import { api, authStore } from '@/lib/api';
import { Badge, Card, CardHeader, DataTable, Field, Modal, PageHeader, Spinner, StatusBadge } from '@/components/ui';
import { UserEditor } from '@/components/UserEditor';
import { formatDate, formatMoney, ROLE_LABELS } from '@/lib/format';

export default function SettingsPage() {
  const [school, setSchool] = useState<any>(null);
  const [years, setYears] = useState<any>(null);
  const [fees, setFees] = useState<any>(null);
  const [users, setUsers] = useState<any>(null);
  const [editUser, setEditUser] = useState<any>(null);
  const [me, setMe] = useState<any>(null);
  const [modal, setModal] = useState<'year' | 'fee' | 'user' | '2fa' | null>(null);
  const [form, setForm] = useState<any>({});
  const [twoFa, setTwoFa] = useState<any>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const currency = authStore.school?.currency ?? 'XOF';

  const load = useCallback(() => {
    api('/schools/current').then(setSchool).catch(() => undefined);
    api('/academics/academic-years?pageSize=20').then(setYears).catch(() => undefined);
    api('/finance/fees?pageSize=100').then(setFees).catch(() => undefined);
    api('/schools/users?pageSize=50').then(setUsers).catch(() => undefined);
    api('/auth/me').then(setMe).catch(() => undefined);
  }, []);
  useEffect(load, [load]);

  const saveSchool = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(''); setError('');
    try {
      await api('/schools/current', {
        method: 'PATCH',
        body: JSON.stringify({
          name: school.name, address: school.address, city: school.city,
          phone: school.phone, email: school.email, currency: school.currency,
          timezone: school.timezone,
        }),
      });
      setMessage('Paramètres enregistrés.');
    } catch (err: any) {
      setError(err.message);
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      if (modal === 'year') {
        await api('/academics/academic-years', { method: 'POST', body: JSON.stringify(form) });
      } else if (modal === 'fee') {
        await api('/finance/fees', { method: 'POST', body: JSON.stringify({ ...form, amount: parseInt(form.amount, 10) }) });
      } else if (modal === 'user') {
        await api('/schools/users', { method: 'POST', body: JSON.stringify(form) });
      }
      setModal(null); setForm({}); load();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const setup2fa = async () => {
    setModal('2fa');
    setTwoFa(null);
    try {
      const data = await api('/auth/2fa/setup', { method: 'POST' });
      setTwoFa(data);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const enable2fa = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await api('/auth/2fa/enable', { method: 'POST', body: JSON.stringify({ totpCode: form.totpCode }) });
      setModal(null);
      setMessage('Double authentification activée ✔');
      load();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const yearAction = async (id: string, action: 'close' | 'archive' | 'reopen') => {
    await api(`/academics/academic-years/${id}/${action}`, { method: 'POST' });
    load();
  };

  if (!school) return <Spinner />;

  return (
    <div className="animate-fade-in-up">
      <PageHeader title="Paramètres" subtitle={`${school.name} · ${school.code}`} />
      {message && <p className="mb-3 rounded-lg bg-emerald-50 px-4 py-2.5 text-sm text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">{message}</p>}

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Établissement */}
        <Card>
          <CardHeader title="Établissement" subtitle="Identité et personnalisation" />
          <form onSubmit={saveSchool} className="space-y-4 p-5">
            <Field label="Nom" required>
              <input required className="input" value={school.name ?? ''} onChange={(e) => setSchool({ ...school, name: e.target.value })} />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Ville"><input className="input" value={school.city ?? ''} onChange={(e) => setSchool({ ...school, city: e.target.value })} /></Field>
              <Field label="Téléphone"><input className="input" value={school.phone ?? ''} onChange={(e) => setSchool({ ...school, phone: e.target.value })} /></Field>
              <Field label="Devise">
                <select className="input" value={school.currency} onChange={(e) => setSchool({ ...school, currency: e.target.value })}>
                  {['XOF', 'XAF', 'GNF', 'MAD', 'NGN', 'KES', 'EUR', 'USD'].map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </Field>
              <Field label="Fuseau horaire">
                <input className="input" value={school.timezone ?? ''} onChange={(e) => setSchool({ ...school, timezone: e.target.value })} />
              </Field>
            </div>
            <Field label="Adresse"><input className="input" value={school.address ?? ''} onChange={(e) => setSchool({ ...school, address: e.target.value })} /></Field>
            <button type="submit" className="btn-primary">Enregistrer</button>
          </form>
        </Card>

        {/* Sécurité */}
        <div className="space-y-4">
          <Card>
            <CardHeader title="Sécurité de mon compte" action={<ShieldCheck size={16} className="text-emerald-600" />} />
            <div className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Double authentification (2FA)</p>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    Code temporaire via Google Authenticator ou équivalent.
                  </p>
                </div>
                {me?.twoFactorEnabled ? (
                  <Badge color="green">Activée</Badge>
                ) : (
                  <button className="btn-primary !py-1.5" onClick={setup2fa}>Activer</button>
                )}
              </div>
            </div>
          </Card>

          <Card>
            <CardHeader
              title="Années scolaires"
              action={<button className="btn-secondary !px-2.5 !py-1.5" onClick={() => { setForm({}); setModal('year'); }}><Plus size={14} /></button>}
            />
            <div className="p-3">
              {years?.items.map((y: any) => (
                <div key={y.id} className="mb-2 flex items-center justify-between rounded-lg border px-3 py-2" style={{ borderColor: 'var(--border)' }}>
                  <div>
                    <p className="text-sm font-medium">{y.name}</p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{formatDate(y.startDate)} → {formatDate(y.endDate)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={y.status} />
                    {y.status === 'ACTIVE' && <button className="btn-secondary !px-2 !py-1 text-xs" onClick={() => yearAction(y.id, 'close')}>Clôturer</button>}
                    {y.status === 'CLOSED' && (
                      <>
                        <button className="btn-secondary !px-2 !py-1 text-xs" onClick={() => yearAction(y.id, 'archive')}>Archiver</button>
                        <button className="btn-secondary !px-2 !py-1 text-xs" onClick={() => yearAction(y.id, 'reopen')}>Rouvrir</button>
                      </>
                    )}
                    {y.status === 'ARCHIVED' && <button className="btn-secondary !px-2 !py-1 text-xs" onClick={() => yearAction(y.id, 'reopen')}>Rouvrir</button>}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      {/* Frais + utilisateurs */}
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader
            title="Grille des frais"
            action={<button className="btn-secondary !px-2.5 !py-1.5" onClick={() => { setForm({ category: 'SCOLARITE', frequency: 'MONTHLY' }); setModal('fee'); }}><Plus size={14} /></button>}
          />
          {!fees ? <Spinner /> : (
            <DataTable
              columns={[
                { key: 'name', header: 'Frais', render: (f: any) => <span className="font-medium">{f.name}</span> },
                { key: 'category', header: 'Catégorie', render: (f: any) => <Badge color="blue">{f.category}</Badge> },
                { key: 'amount', header: 'Montant', render: (f: any) => <span className="tabular-nums">{formatMoney(f.amount, currency)}</span> },
                { key: 'frequency', header: 'Fréquence' },
                { key: 'level', header: 'Niveau', render: (f: any) => f.level?.name ?? 'Tous' },
              ]}
              rows={fees.items}
              emptyLabel="Aucun frais défini"
            />
          )}
        </Card>

        <Card>
          <CardHeader
            title="Utilisateurs & rôles"
            subtitle="Cliquez sur un utilisateur pour gérer son rôle et ses permissions"
            action={<button className="btn-secondary !px-2.5 !py-1.5" onClick={() => { setForm({ role: 'SECRETARY' }); setModal('user'); }}><Plus size={14} /></button>}
          />
          {!users ? <Spinner /> : (
            <DataTable
              columns={[
                { key: 'name', header: 'Utilisateur', render: (u: any) => (
                  <div>
                    <p className="font-medium">{u.firstName} {u.lastName}</p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{u.email}</p>
                  </div>
                ) },
                { key: 'role', header: 'Rôle', render: (u: any) => (
                  <span className="flex items-center gap-1.5">
                    <Badge color="violet">{ROLE_LABELS[u.role] ?? u.role}</Badge>
                    {u.permissionOverrides?.length > 0 && <Badge color="blue">personnalisé</Badge>}
                  </span>
                ) },
                { key: 'twoFactorEnabled', header: '2FA', render: (u: any) => (u.twoFactorEnabled ? <Badge color="green">Oui</Badge> : <Badge color="gray">Non</Badge>) },
                { key: 'status', header: 'Statut', render: (u: any) => <StatusBadge status={u.status} /> },
              ]}
              rows={users.items}
              onRowClick={(u: any) => setEditUser(u)}
              emptyLabel="Aucun utilisateur"
            />
          )}
        </Card>
      </div>

      {/* Modales */}
      <Modal open={modal === 'year'} onClose={() => setModal(null)} title="Nouvelle année scolaire">
        <form onSubmit={submit} className="space-y-4">
          <Field label="Nom" required><input required className="input" value={form.name ?? ''} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="2026-2027" /></Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Début" required><input type="date" required className="input" value={form.startDate ?? ''} onChange={(e) => setForm({ ...form, startDate: e.target.value })} /></Field>
            <Field label="Fin" required><input type="date" required className="input" value={form.endDate ?? ''} onChange={(e) => setForm({ ...form, endDate: e.target.value })} /></Field>
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <button type="submit" className="btn-primary w-full">Créer</button>
        </form>
      </Modal>

      <Modal open={modal === 'fee'} onClose={() => setModal(null)} title="Nouveau frais">
        <form onSubmit={submit} className="space-y-4">
          <Field label="Nom" required><input required className="input" value={form.name ?? ''} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Scolarité mensuelle 6e" /></Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Catégorie">
              <select className="input" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                {['INSCRIPTION', 'SCOLARITE', 'UNIFORME', 'ASSURANCE', 'CANTINE', 'TRANSPORT', 'BIBLIOTHEQUE', 'AUTRE'].map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </Field>
            <Field label="Montant" required><input type="number" required className="input" value={form.amount ?? ''} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></Field>
            <Field label="Fréquence">
              <select className="input" value={form.frequency} onChange={(e) => setForm({ ...form, frequency: e.target.value })}>
                <option value="ONCE">Unique</option><option value="MONTHLY">Mensuel</option>
                <option value="QUARTERLY">Trimestriel</option><option value="YEARLY">Annuel</option>
              </select>
            </Field>
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <button type="submit" className="btn-primary w-full">Créer</button>
        </form>
      </Modal>

      <Modal open={modal === 'user'} onClose={() => setModal(null)} title="Nouvel utilisateur">
        <form onSubmit={submit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Prénom" required><input required className="input" value={form.firstName ?? ''} onChange={(e) => setForm({ ...form, firstName: e.target.value })} /></Field>
            <Field label="Nom" required><input required className="input" value={form.lastName ?? ''} onChange={(e) => setForm({ ...form, lastName: e.target.value })} /></Field>
          </div>
          <Field label="Email" required><input type="email" required className="input" value={form.email ?? ''} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Mot de passe" required><input type="password" required minLength={8} className="input" value={form.password ?? ''} onChange={(e) => setForm({ ...form, password: e.target.value })} /></Field>
            <Field label="Rôle" required>
              <select className="input" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                {Object.entries(ROLE_LABELS).filter(([k]) => k !== 'SUPER_ADMIN').map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </Field>
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <button type="submit" className="btn-primary w-full">Créer</button>
        </form>
      </Modal>

      <Modal open={modal === '2fa'} onClose={() => setModal(null)} title="Activer la double authentification">
        {!twoFa ? <Spinner /> : (
          <form onSubmit={enable2fa} className="space-y-4 text-center">
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              1. Scannez ce QR code avec Google Authenticator, Authy ou équivalent.
            </p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={twoFa.qrCodeDataUrl} alt="QR code 2FA" className="mx-auto h-44 w-44 rounded-lg border p-2" style={{ borderColor: 'var(--border)' }} />
            <p className="break-all text-xs" style={{ color: 'var(--text-muted)' }}>Clé manuelle : {twoFa.secret}</p>
            <Field label="2. Saisissez le code à 6 chiffres" required>
              <input required className="input text-center text-lg tracking-[0.4em]" maxLength={6} value={form.totpCode ?? ''} onChange={(e) => setForm({ ...form, totpCode: e.target.value.replace(/\D/g, '') })} placeholder="000000" />
            </Field>
            {error && <p className="text-sm text-red-500">{error}</p>}
            <button type="submit" className="btn-primary w-full">Activer la 2FA</button>
          </form>
        )}
      </Modal>

      {editUser && (
        <UserEditor
          user={editUser}
          isSelf={editUser.id === me?.id}
          onClose={() => setEditUser(null)}
          onSaved={load}
        />
      )}
    </div>
  );
}
