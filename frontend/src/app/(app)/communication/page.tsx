'use client';

// Communication : envoi multi-canal (interne, email, SMS, WhatsApp, push),
// annonces et notifications.

import { useCallback, useEffect, useState } from 'react';
import { Megaphone, Send } from 'lucide-react';
import { api } from '@/lib/api';
import { Badge, Card, CardHeader, DataTable, EmptyState, Field, Modal, PageHeader, Spinner } from '@/components/ui';
import { formatDateTime } from '@/lib/format';

const CHANNELS: Record<string, string> = {
  INTERNAL: 'Interne', EMAIL: 'Email', SMS: 'SMS', WHATSAPP: 'WhatsApp', PUSH: 'Push',
};
const AUDIENCES: Record<string, string> = {
  ALL: 'Tout l\'établissement', PARENTS: 'Tous les parents', TEACHERS: 'Tous les enseignants', STAFF: 'Personnel',
};

export default function CommunicationPage() {
  const [messages, setMessages] = useState<any>(null);
  const [announcements, setAnnouncements] = useState<any>(null);
  const [notifications, setNotifications] = useState<any>(null);
  const [modal, setModal] = useState<'message' | 'announcement' | null>(null);
  const [form, setForm] = useState<any>({ channel: 'INTERNAL', audience: 'ALL' });
  const [channels, setChannels] = useState<any>(null);
  const [result, setResult] = useState('');
  const [warning, setWarning] = useState('');
  const [error, setError] = useState('');

  const load = useCallback(() => {
    api('/comms/messages?pageSize=25').then(setMessages).catch(() => undefined);
    api('/comms/announcements?pageSize=20').then(setAnnouncements).catch(() => undefined);
    api('/comms/notifications').then(setNotifications).catch(() => undefined);
    api('/comms/channels').then(setChannels).catch(() => undefined);
  }, []);
  useEffect(load, [load]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setResult(''); setWarning('');
    try {
      if (modal === 'message') {
        const res = await api('/comms/messages', { method: 'POST', body: JSON.stringify(form) });
        if (res.recipients === 0) {
          setWarning(`Aucun destinataire trouvé pour « ${AUDIENCES[form.audience] ?? form.audience} » sur ce canal (numéros/emails manquants ?).`);
        } else if (res.simulated > 0) {
          setWarning(`Message enregistré mais SIMULÉ : le canal ${CHANNELS[form.channel]} n'est pas encore configuré (clés manquantes). ${res.recipients} destinataire(s) auraient été touchés.`);
        } else {
          setResult(`Message envoyé à ${res.recipients} destinataire(s) via ${CHANNELS[form.channel]}.`);
        }
      } else {
        await api('/comms/announcements', { method: 'POST', body: JSON.stringify(form) });
        setResult('Annonce publiée.');
      }
      setModal(null);
      setForm({ channel: 'INTERNAL', audience: 'ALL' });
      load();
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="animate-fade-in-up">
      <PageHeader
        title="Communication"
        actions={
          <>
            <button className="btn-secondary" onClick={() => { setForm({ pinned: false }); setModal('announcement'); }}>
              <Megaphone size={16} /> Annonce
            </button>
            <button className="btn-primary" onClick={() => { setForm({ channel: 'INTERNAL', audience: 'ALL' }); setModal('message'); }}>
              <Send size={16} /> Envoyer un message
            </button>
          </>
        }
      />

      {result && <p className="mb-3 rounded-lg bg-emerald-50 px-4 py-2.5 text-sm text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">{result}</p>}
      {warning && <p className="mb-3 rounded-lg bg-amber-50 px-4 py-2.5 text-sm text-amber-800 dark:bg-amber-950 dark:text-amber-200">{warning}</p>}

      {/* État des canaux d'envoi */}
      {channels && (
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Canaux :</span>
          {[
            ['INTERNAL', 'Interne'], ['EMAIL', 'Email'], ['SMS', 'SMS'], ['WHATSAPP', 'WhatsApp'],
          ].map(([key, label]) => (
            <Badge key={key} color={channels[key]?.configured ? 'green' : 'gray'}>
              {label} {channels[key]?.configured ? '· actif' : '· non configuré'}
            </Badge>
          ))}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Messages envoyés" />
          {!messages ? <Spinner /> : (
            <DataTable
              columns={[
                { key: 'sentAt', header: 'Date', render: (m: any) => formatDateTime(m.sentAt) },
                { key: 'channel', header: 'Canal', render: (m: any) => <Badge color="blue">{CHANNELS[m.channel] ?? m.channel}</Badge> },
                { key: 'audience', header: 'Audience', render: (m: any) => AUDIENCES[m.audience] ?? m.audience },
                { key: 'body', header: 'Message', render: (m: any) => <span className="line-clamp-1">{m.subject ? `${m.subject} — ` : ''}{m.body}</span> },
              ]}
              rows={messages.items}
              emptyLabel="Aucun message envoyé"
            />
          )}
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader title="Annonces" />
            <div className="p-2">
              {!announcements ? <Spinner /> : announcements.items.length === 0 ? <EmptyState title="Aucune annonce" /> : (
                announcements.items.map((a: any) => (
                  <div key={a.id} className="rounded-lg px-3 py-2.5">
                    <p className="text-sm font-medium">{a.pinned && '📌 '}{a.title}</p>
                    <p className="mt-0.5 line-clamp-2 text-xs" style={{ color: 'var(--text-secondary)' }}>{a.body}</p>
                  </div>
                ))
              )}
            </div>
          </Card>
          <Card>
            <CardHeader title="Mes notifications" />
            <div className="p-2">
              {!notifications ? <Spinner /> : notifications.notifications.length === 0 ? <EmptyState title="Aucune notification" /> : (
                notifications.notifications.slice(0, 8).map((n: any) => (
                  <div key={n.id} className="rounded-lg px-3 py-2">
                    <p className={`text-sm ${n.read ? '' : 'font-semibold'}`}>{n.title}</p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{formatDateTime(n.createdAt)}</p>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>
      </div>

      <Modal open={modal === 'message'} onClose={() => setModal(null)} title="Envoyer un message">
        <form onSubmit={submit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Canal" required>
              <select className="input" value={form.channel} onChange={(e) => setForm({ ...form, channel: e.target.value })}>
                {Object.entries(CHANNELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </Field>
            <Field label="Audience" required>
              <select className="input" value={form.audience} onChange={(e) => setForm({ ...form, audience: e.target.value })}>
                {Object.entries(AUDIENCES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </Field>
          </div>
          <Field label="Objet"><input className="input" value={form.subject ?? ''} onChange={(e) => setForm({ ...form, subject: e.target.value })} /></Field>
          <Field label="Message" required>
            <textarea required rows={4} className="input" value={form.body ?? ''} onChange={(e) => setForm({ ...form, body: e.target.value })} />
          </Field>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <button type="submit" className="btn-primary w-full">Envoyer</button>
        </form>
      </Modal>

      <Modal open={modal === 'announcement'} onClose={() => setModal(null)} title="Nouvelle annonce">
        <form onSubmit={submit} className="space-y-4">
          <Field label="Titre" required><input required className="input" value={form.title ?? ''} onChange={(e) => setForm({ ...form, title: e.target.value })} /></Field>
          <Field label="Contenu" required>
            <textarea required rows={4} className="input" value={form.body ?? ''} onChange={(e) => setForm({ ...form, body: e.target.value })} />
          </Field>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.pinned ?? false} onChange={(e) => setForm({ ...form, pinned: e.target.checked })} />
            Épingler en haut du tableau de bord
          </label>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <button type="submit" className="btn-primary w-full">Publier</button>
        </form>
      </Modal>
    </div>
  );
}
