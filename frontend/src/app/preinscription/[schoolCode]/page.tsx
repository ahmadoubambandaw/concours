'use client';

// Formulaire public de pré-inscription en ligne (sans compte).

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { CheckCircle2, GraduationCap } from 'lucide-react';
import { Field } from '@/components/ui';

export default function PublicPreRegistrationPage() {
  const { schoolCode } = useParams<{ schoolCode: string }>();
  const [school, setSchool] = useState<any>(null);
  const [notFound, setNotFound] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState<any>({ gender: 'M' });

  useEffect(() => {
    fetch(`/api/backend/public/${schoolCode}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then(setSchool)
      .catch(() => setNotFound(true));
  }, [schoolCode]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const res = await fetch(`/api/backend/public/${schoolCode}/preregistrations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    if (res.ok) setDone(true);
    else {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? 'Erreur lors de l\'envoi');
    }
  };

  if (notFound) {
    return (
      <main className="flex min-h-screen items-center justify-center p-4">
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Établissement introuvable.</p>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-xl">
        <div className="mb-6 text-center">
          <GraduationCap className="mx-auto text-brand-600" size={36} />
          <h1 className="mt-3 text-xl font-bold">{school?.name ?? '…'}</h1>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            Formulaire de pré-inscription en ligne
          </p>
        </div>

        {done ? (
          <div className="card p-8 text-center">
            <CheckCircle2 className="mx-auto text-emerald-500" size={44} />
            <h2 className="mt-4 text-lg font-semibold">Pré-inscription envoyée !</h2>
            <p className="mt-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
              L&apos;établissement examinera votre demande et vous contactera au numéro indiqué.
            </p>
          </div>
        ) : (
          <form onSubmit={submit} className="card space-y-4 p-6">
            <h2 className="text-sm font-semibold">L&apos;élève</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Prénom" required><input required className="input" value={form.firstName ?? ''} onChange={(e) => setForm({ ...form, firstName: e.target.value })} /></Field>
              <Field label="Nom" required><input required className="input" value={form.lastName ?? ''} onChange={(e) => setForm({ ...form, lastName: e.target.value })} /></Field>
              <Field label="Sexe" required>
                <select className="input" value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })}>
                  <option value="M">Garçon</option><option value="F">Fille</option>
                </select>
              </Field>
              <Field label="Date de naissance" required>
                <input type="date" required className="input" value={form.birthDate ?? ''} onChange={(e) => setForm({ ...form, birthDate: e.target.value })} />
              </Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Niveau souhaité" required>
                <input required className="input" value={form.desiredLevel ?? ''} onChange={(e) => setForm({ ...form, desiredLevel: e.target.value })} placeholder="6e, CM2, Seconde…" />
              </Field>
              <Field label="École précédente">
                <input className="input" value={form.previousSchool ?? ''} onChange={(e) => setForm({ ...form, previousSchool: e.target.value })} />
              </Field>
            </div>
            <h2 className="pt-2 text-sm font-semibold">Le parent / tuteur</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Nom complet" required>
                <input required className="input" value={form.guardianName ?? ''} onChange={(e) => setForm({ ...form, guardianName: e.target.value })} />
              </Field>
              <Field label="Téléphone" required>
                <input required className="input" value={form.guardianPhone ?? ''} onChange={(e) => setForm({ ...form, guardianPhone: e.target.value })} />
              </Field>
            </div>
            <Field label="Email">
              <input type="email" className="input" value={form.guardianEmail ?? ''} onChange={(e) => setForm({ ...form, guardianEmail: e.target.value || undefined })} />
            </Field>
            {error && <p className="text-sm text-red-500">{error}</p>}
            <button type="submit" className="btn-primary w-full">Envoyer la pré-inscription</button>
          </form>
        )}
      </div>
    </main>
  );
}
