'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { GraduationCap, KeyRound } from 'lucide-react';
import { api, authStore } from '@/lib/api';
import { Field } from '@/components/ui';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [schoolCode, setSchoolCode] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [needsTotp, setNeedsTotp] = useState(false);
  const [needsSchool, setNeedsSchool] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await api('/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email,
          password,
          ...(schoolCode ? { schoolCode } : {}),
          ...(totpCode ? { totpCode } : {}),
        }),
      });
      if (data.requiresTwoFactor) {
        setNeedsTotp(true);
        return;
      }
      authStore.saveSession(data);
      router.push(data.user.role === 'PARENT' || data.user.role === 'STUDENT' ? '/portal' : '/dashboard');
    } catch (err: any) {
      if (String(err.message).includes('plusieurs établissements')) setNeedsSchool(true);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <Link href="/" className="mb-8 flex items-center justify-center gap-2 text-xl font-bold">
          <GraduationCap className="text-brand-600" size={28} /> Scolaris
        </Link>
        <div className="card p-6">
          <h1 className="text-lg font-semibold">Connexion</h1>
          <p className="mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>
            Accédez à votre espace établissement.
          </p>
          <form onSubmit={submit} className="mt-6 space-y-4">
            {!needsTotp && (
              <>
                <Field label="Email" required>
                  <input type="email" required className="input" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="vous@ecole.sn" />
                </Field>
                <Field label="Mot de passe" required>
                  <input type="password" required className="input" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
                </Field>
                {needsSchool && (
                  <Field label="Code établissement" required>
                    <input className="input uppercase" value={schoolCode} onChange={(e) => setSchoolCode(e.target.value)} placeholder="MONECOLE" />
                  </Field>
                )}
              </>
            )}
            {needsTotp && (
              <Field label="Code de vérification (2FA)" required>
                <div className="flex items-center gap-2">
                  <KeyRound size={18} className="text-brand-600" />
                  <input
                    className="input text-center text-lg tracking-[0.4em]"
                    value={totpCode}
                    onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="000000"
                    autoFocus
                  />
                </div>
              </Field>
            )}
            {error && <p className="text-sm text-red-500">{error}</p>}
            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? 'Connexion…' : needsTotp ? 'Vérifier' : 'Se connecter'}
            </button>
          </form>
        </div>
        <p className="mt-4 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
          Pas encore de compte ?{' '}
          <Link href="/register" className="font-medium text-brand-600 hover:underline">Créer un établissement</Link>
        </p>
      </div>
    </main>
  );
}
