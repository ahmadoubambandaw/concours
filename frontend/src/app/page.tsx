// Landing page publique — présentation du SaaS.

import Link from 'next/link';
import {
  BarChart3,
  BookOpen,
  Bus,
  CalendarDays,
  CreditCard,
  GraduationCap,
  MessageSquare,
  ShieldCheck,
  Sparkles,
  Users,
} from 'lucide-react';

const FEATURES = [
  { icon: Users, title: 'Élèves & inscriptions', text: 'Dossiers complets, matricules automatiques, QR codes, pré-inscriptions en ligne et gestion des parents.' },
  { icon: GraduationCap, title: 'Notes & bulletins', text: 'Moyennes pondérées, classements, mentions, bulletins PDF signés électroniquement, délibérations automatiques.' },
  { icon: CreditCard, title: 'Paiements & finances', text: 'Scolarité, cantine, transport. Orange Money, Wave, Free Money, carte bancaire. Reçus PDF et relances automatiques.' },
  { icon: CalendarDays, title: 'Emplois du temps', text: 'Génération intelligente avec détection des conflits de salles et d\'enseignants.' },
  { icon: BarChart3, title: 'Tableaux de bord', text: 'Effectifs, présences, encaissements, taux de réussite : tout en temps réel, avec comparaison entre années.' },
  { icon: MessageSquare, title: 'Communication', text: 'SMS, email, WhatsApp et notifications push vers les parents, enseignants et élèves.' },
  { icon: BookOpen, title: 'Vie scolaire', text: 'Bibliothèque, cantine, discipline, infirmerie : tous les services de l\'établissement au même endroit.' },
  { icon: Bus, title: 'Transport', text: 'Bus, itinéraires, arrêts et affectation des élèves.' },
  { icon: Sparkles, title: 'Assistant IA', text: 'Détection des élèves en difficulté, prédiction des risques d\'échec et rapports automatiques.' },
];

const ROLES = ['Administrateur', 'Directeur', 'Proviseur', 'Comptable', 'Secrétaire', 'Enseignant', 'Parent', 'Élève', 'Bibliothécaire', 'Surveillant', 'Infirmier', 'Chauffeur'];

export default function LandingPage() {
  return (
    <main className="min-h-screen">
      {/* Barre de navigation */}
      <header className="sticky top-0 z-40 border-b backdrop-blur-lg" style={{ borderColor: 'var(--border)', background: 'color-mix(in srgb, var(--surface-0) 80%, transparent)' }}>
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <div className="flex items-center gap-2 text-lg font-bold">
            <GraduationCap className="text-brand-600" size={26} />
            Scolaris
          </div>
          <nav className="hidden items-center gap-6 text-sm md:flex" style={{ color: 'var(--text-secondary)' }}>
            <a href="#modules" className="hover:text-brand-600">Modules</a>
            <a href="#roles" className="hover:text-brand-600">Pour qui ?</a>
            <a href="#securite" className="hover:text-brand-600">Sécurité</a>
          </nav>
          <div className="flex items-center gap-2">
            <Link href="/login" className="btn-secondary">Se connecter</Link>
            <Link href="/register" className="btn-primary">Essai gratuit</Link>
          </div>
        </div>
      </header>

      {/* Héros */}
      <section className="mx-auto max-w-6xl px-4 pb-20 pt-24 text-center">
        <span className="mb-6 inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium" style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}>
          <Sparkles size={13} className="text-brand-600" /> Multi-établissements · Cloud · IA intégrée
        </span>
        <h1 className="mx-auto max-w-3xl text-4xl font-extrabold leading-tight tracking-tight md:text-6xl">
          La gestion scolaire, <span className="text-brand-600">enfin simple</span>.
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg" style={{ color: 'var(--text-secondary)' }}>
          De la maternelle au lycée, Scolaris centralise élèves, notes, bulletins, paiements,
          emplois du temps et communication — pensé pour les établissements africains et francophones.
        </p>
        <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
          <Link href="/register" className="btn-primary px-6 py-3 text-base">Créer mon établissement — 30 jours offerts</Link>
          <Link href="/login" className="btn-secondary px-6 py-3 text-base">Découvrir la démo</Link>
        </div>
        <p className="mt-4 text-xs" style={{ color: 'var(--text-muted)' }}>
          Sans carte bancaire · Données isolées par établissement · Conforme RGPD
        </p>
      </section>

      {/* Modules */}
      <section id="modules" className="mx-auto max-w-6xl px-4 py-16">
        <h2 className="text-center text-3xl font-bold">Tout votre établissement, un seul outil</h2>
        <p className="mt-3 text-center" style={{ color: 'var(--text-secondary)' }}>
          25+ modules intégrés, activables selon vos besoins.
        </p>
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <div key={f.title} className="card p-6 transition-shadow hover:shadow-card-hover">
              <f.icon className="text-brand-600" size={24} />
              <h3 className="mt-4 font-semibold">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{f.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Rôles */}
      <section id="roles" className="mx-auto max-w-6xl px-4 py-16">
        <div className="card p-10 text-center">
          <h2 className="text-2xl font-bold">Un espace pour chaque acteur</h2>
          <p className="mx-auto mt-3 max-w-xl text-sm" style={{ color: 'var(--text-secondary)' }}>
            13 rôles avec permissions fines : chacun voit exactement ce dont il a besoin, rien de plus.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-2">
            {ROLES.map((r) => (
              <span key={r} className="rounded-full border px-3 py-1.5 text-sm" style={{ borderColor: 'var(--border)' }}>{r}</span>
            ))}
          </div>
        </div>
      </section>

      {/* Sécurité */}
      <section id="securite" className="mx-auto max-w-6xl px-4 py-16">
        <div className="grid items-center gap-10 md:grid-cols-2">
          <div>
            <ShieldCheck className="text-brand-600" size={32} />
            <h2 className="mt-4 text-2xl font-bold">Sécurité de niveau bancaire</h2>
            <ul className="mt-6 space-y-3 text-sm" style={{ color: 'var(--text-secondary)' }}>
              <li>• Double authentification (2FA) compatible Google Authenticator</li>
              <li>• Isolation totale des données de chaque établissement</li>
              <li>• Mots de passe chiffrés (bcrypt), sessions révocables à distance</li>
              <li>• Journal d&apos;audit complet de toutes les actions</li>
              <li>• Protection XSS, CSRF, injections SQL et force brute</li>
              <li>• Sauvegardes automatiques quotidiennes</li>
            </ul>
          </div>
          <div className="card p-8">
            <h3 className="font-semibold">Prêt en 5 minutes</h3>
            <ol className="mt-4 space-y-4 text-sm" style={{ color: 'var(--text-secondary)' }}>
              <li><b className="text-brand-600">1.</b> Créez votre établissement (nom + code unique)</li>
              <li><b className="text-brand-600">2.</b> Ajoutez vos classes, matières et enseignants</li>
              <li><b className="text-brand-600">3.</b> Inscrivez vos élèves — ou ouvrez les pré-inscriptions en ligne</li>
              <li><b className="text-brand-600">4.</b> Encaissez, notez, communiquez. C&apos;est tout.</li>
            </ol>
            <Link href="/register" className="btn-primary mt-6 w-full">Commencer gratuitement</Link>
          </div>
        </div>
      </section>

      <footer className="border-t py-10 text-center text-sm" style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
        <div className="flex items-center justify-center gap-2 font-semibold" style={{ color: 'var(--text-primary)' }}>
          <GraduationCap size={18} className="text-brand-600" /> Scolaris
        </div>
        <p className="mt-2">ERP de gestion scolaire — © {new Date().getFullYear()}</p>
      </footer>
    </main>
  );
}
