'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { GraduationCap } from 'lucide-react';
import { api, authStore } from '@/lib/api';
import { Field } from '@/components/ui';

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    schoolName: '',
    schoolCode: '',
    schoolType: 'COMPLEXE',
    city: '',
    firstName: '',
    lastName: '',
    email: '',
    password: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const set = (key: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await api('/auth/register-school', { method: 'POST', body: JSON.stringify(form) });
      authStore.saveSession(data);
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <Link href="/" className="mb-8 flex items-center justify-center gap-2 text-xl font-bold">
          <GraduationCap className="text-brand-600" size={28} /> Scolaris
        </Link>
        <div className="card p-6">
          <h1 className="text-lg font-semibold">Créer votre établissement</h1>
          <p className="mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>
            30 jours d&apos;essai gratuit, sans carte bancaire.
          </p>
          <form onSubmit={submit} className="mt-6 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Nom de l'établissement" required>
                <input required className="input" value={form.schoolName} onChange={set('schoolName')} placeholder="Groupe Scolaire…" />
              </Field>
              <Field label="Code unique" required>
                <input required className="input uppercase" value={form.schoolCode} onChange={set('schoolCode')} placeholder="MONECOLE" maxLength={10} />
              </Field>
              <Field label="Type" required>
                <select className="input" value={form.schoolType} onChange={set('schoolType')}>
                  <option value="MATERNELLE">Maternelle</option>
                  <option value="PRIMAIRE">Primaire</option>
                  <option value="COLLEGE">Collège</option>
                  <option value="LYCEE">Lycée</option>
                  <option value="COMPLEXE">Complexe (plusieurs cycles)</option>
                </select>
              </Field>
              <Field label="Ville">
                <input className="input" value={form.city} onChange={set('city')} placeholder="Dakar" />
              </Field>
            </div>
            <hr style={{ borderColor: 'var(--border)' }} />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Votre prénom" required>
                <input required className="input" value={form.firstName} onChange={set('firstName')} />
              </Field>
              <Field label="Votre nom" required>
                <input required className="input" value={form.lastName} onChange={set('lastName')} />
              </Field>
            </div>
            <Field label="Email" required>
              <input type="email" required className="input" value={form.email} onChange={set('email')} placeholder="vous@ecole.sn" />
            </Field>
            <Field label="Mot de passe (8 caractères min.)" required>
              <input type="password" required minLength={8} className="input" value={form.password} onChange={set('password')} />
            </Field>
            {error && <p className="text-sm text-red-500">{error}</p>}
            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? 'Création…' : 'Créer mon établissement'}
            </button>
          </form>
        </div>
        <p className="mt-4 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
          Déjà inscrit ?{' '}
          <Link href="/login" className="font-medium text-brand-600 hover:underline">Se connecter</Link>
        </p>
      </div>
    </main>
  );
}
