'use client';

// Profil de l'utilisateur connecté : informations personnelles,
// changement de mot de passe, sécurité (2FA) et sessions actives.

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { KeyRound, LogOut, ShieldCheck, Trash2 } from 'lucide-react';
import { api, authStore } from '@/lib/api';
import { Avatar, Badge, Card, CardHeader, EmptyState, Field, PageHeader, Spinner } from '@/components/ui';
import { formatDateTime, ROLE_LABELS } from '@/lib/format';

export default function ProfilePage() {
  const [me, setMe] = useState<any>(null);
  const [sessions, setSessions] = useState<any[] | null>(null);
  const [profile, setProfile] = useState({ firstName: '', lastName: '', phone: '' });
  const [pwd, setPwd] = useState({ currentPassword: '', newPassword: '' });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const load = useCallback(() => {
    api('/auth/me').then((u) => {
      setMe(u);
      setProfile({ firstName: u.firstName ?? '', lastName: u.lastName ?? '', phone: u.phone ?? '' });
    });
    api('/auth/sessions').then(setSessions).catch(() => setSessions([]));
  }, []);
  useEffect(load, [load]);

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(''); setError('');
    try {
      await api('/auth/me', { method: 'PATCH', body: JSON.stringify(profile) });
      // Met à jour le nom affiché dans la barre.
      const stored = authStore.user;
      if (stored) localStorage.setItem('scolaris.user', JSON.stringify({ ...stored, ...profile }));
      setMessage('Profil mis à jour.');
    } catch (err: any) {
      setError(err.message);
    }
  };

  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(''); setError('');
    try {
      await api('/auth/change-password', { method: 'POST', body: JSON.stringify(pwd) });
      setPwd({ currentPassword: '', newPassword: '' });
      setMessage('Mot de passe modifié. Les autres appareils ont été déconnectés.');
      load();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const revoke = async (id: string) => {
    await api(`/auth/sessions/${id}`, { method: 'DELETE' });
    load();
  };

  if (!me) return <Spinner />;

  return (
    <div className="animate-fade-in-up">
      <PageHeader title="Mon profil" subtitle={me.email} />

      {message && <p className="mb-3 rounded-lg bg-emerald-50 px-4 py-2.5 text-sm text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">{message}</p>}
      {error && <p className="mb-3 rounded-lg bg-red-50 px-4 py-2.5 text-sm text-red-800 dark:bg-red-950 dark:text-red-300">{error}</p>}

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Informations personnelles */}
        <Card>
          <CardHeader title="Informations personnelles" />
          <form onSubmit={saveProfile} className="space-y-4 p-5">
            <div className="flex items-center gap-4">
              <Avatar name={`${me.firstName} ${me.lastName}`} photoUrl={me.avatarUrl} size={56} />
              <div>
                <p className="font-medium">{me.firstName} {me.lastName}</p>
                <Badge color="violet">{ROLE_LABELS[me.role] ?? me.role}</Badge>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Prénom" required>
                <input required className="input" value={profile.firstName} onChange={(e) => setProfile({ ...profile, firstName: e.target.value })} />
              </Field>
              <Field label="Nom" required>
                <input required className="input" value={profile.lastName} onChange={(e) => setProfile({ ...profile, lastName: e.target.value })} />
              </Field>
            </div>
            <Field label="Téléphone">
              <input className="input" value={profile.phone} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} />
            </Field>
            <button type="submit" className="btn-primary">Enregistrer</button>
          </form>
        </Card>

        <div className="space-y-4">
          {/* Mot de passe */}
          <Card>
            <CardHeader title="Changer le mot de passe" action={<KeyRound size={16} style={{ color: 'var(--text-muted)' }} />} />
            <form onSubmit={changePassword} className="space-y-4 p-5">
              <Field label="Mot de passe actuel" required>
                <input type="password" required className="input" value={pwd.currentPassword} onChange={(e) => setPwd({ ...pwd, currentPassword: e.target.value })} />
              </Field>
              <Field label="Nouveau mot de passe (8 caractères min.)" required>
                <input type="password" required minLength={8} className="input" value={pwd.newPassword} onChange={(e) => setPwd({ ...pwd, newPassword: e.target.value })} />
              </Field>
              <button type="submit" className="btn-secondary">Modifier le mot de passe</button>
            </form>
          </Card>

          {/* Sécurité */}
          <Card>
            <CardHeader title="Sécurité" action={<ShieldCheck size={16} className="text-emerald-600" />} />
            <div className="flex items-center justify-between p-5">
              <div>
                <p className="text-sm font-medium">Double authentification (2FA)</p>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Renforce la sécurité de votre compte.</p>
              </div>
              {me.twoFactorEnabled ? (
                <Badge color="green">Activée</Badge>
              ) : (
                <Link href="/settings" className="btn-primary !py-1.5">Configurer</Link>
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* Sessions actives */}
      <Card className="mt-4">
        <CardHeader title="Appareils connectés" subtitle="Révoquez l'accès d'un appareil que vous ne reconnaissez pas" />
        <div className="p-3">
          {!sessions ? (
            <Spinner />
          ) : sessions.length === 0 ? (
            <EmptyState title="Aucune autre session active" />
          ) : (
            sessions.map((s) => (
              <div key={s.id} className="flex items-center justify-between rounded-lg px-3 py-2.5 hover:bg-black/[0.025] dark:hover:bg-white/[0.04]">
                <div className="min-w-0">
                  <p className="truncate text-sm">{s.userAgent ?? 'Appareil inconnu'}</p>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    {s.ip ?? '—'} · connecté le {formatDateTime(s.createdAt)}
                  </p>
                </div>
                <button className="btn-secondary !px-2.5 !py-1.5" onClick={() => revoke(s.id)} title="Révoquer">
                  <Trash2 size={14} className="text-red-500" />
                </button>
              </div>
            ))
          )}
        </div>
      </Card>

      <div className="mt-6 flex justify-center">
        <button onClick={() => authStore.logout()} className="btn-secondary">
          <LogOut size={15} /> Se déconnecter
        </button>
      </div>
    </div>
  );
}
