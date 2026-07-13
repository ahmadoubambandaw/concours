'use client';

// Shell de l'application : barre latérale (navigation par rôle),
// barre supérieure (recherche globale, thème, notifications, profil).

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  BarChart3, Bell, BookOpen, Bus, CalendarDays, ClipboardCheck, CreditCard,
  GraduationCap, HeartPulse, LayoutDashboard, Library, LogOut, Menu, MessageSquare,
  Moon, School, Search, Settings, ShieldAlert, Sparkles, Sun, UserRound,
  Users, UtensilsCrossed, Wallet, X, FileText, Briefcase,
} from 'lucide-react';
import { api, authStore, type ApiSchool, type ApiUser } from '@/lib/api';
import { Avatar } from '@/components/ui';
import { ROLE_LABELS } from '@/lib/format';

interface NavItem {
  href: string;
  label: string;
  icon: any;
  roles?: string[]; // visible par défaut pour tous les rôles "staff"
}

const STAFF = ['SUPER_ADMIN', 'SCHOOL_ADMIN', 'DIRECTOR', 'PRINCIPAL', 'ACCOUNTANT', 'SECRETARY', 'TEACHER', 'LIBRARIAN', 'SUPERVISOR', 'NURSE'];
const ADMINS = ['SUPER_ADMIN', 'SCHOOL_ADMIN', 'DIRECTOR', 'PRINCIPAL'];

const NAV_SECTIONS: { title: string; items: NavItem[] }[] = [
  {
    title: 'Pilotage',
    items: [
      { href: '/dashboard', label: 'Tableau de bord', icon: LayoutDashboard, roles: STAFF },
      { href: '/ai', label: 'Assistant IA', icon: Sparkles, roles: ADMINS.concat('TEACHER') },
    ],
  },
  {
    title: 'Scolarité',
    items: [
      { href: '/students', label: 'Élèves', icon: Users, roles: STAFF },
      { href: '/preregistrations', label: 'Pré-inscriptions', icon: ClipboardCheck, roles: ADMINS.concat('SECRETARY') },
      { href: '/classes', label: 'Classes & niveaux', icon: School, roles: ADMINS.concat('SECRETARY', 'TEACHER') },
      { href: '/teachers', label: 'Enseignants', icon: GraduationCap, roles: ADMINS.concat('SECRETARY') },
      { href: '/grades', label: 'Notes & bulletins', icon: FileText, roles: ADMINS.concat('TEACHER') },
      { href: '/attendance', label: 'Présences', icon: ClipboardCheck, roles: ADMINS.concat('TEACHER', 'SUPERVISOR', 'SECRETARY') },
      { href: '/timetable', label: 'Emploi du temps', icon: CalendarDays, roles: STAFF },
    ],
  },
  {
    title: 'Finances',
    items: [
      { href: '/finance', label: 'Paiements & factures', icon: CreditCard, roles: ADMINS.concat('ACCOUNTANT', 'SECRETARY') },
      { href: '/accounting', label: 'Comptabilité', icon: Wallet, roles: ADMINS.concat('ACCOUNTANT') },
      { href: '/hr', label: 'RH & paie', icon: Briefcase, roles: ADMINS.concat('ACCOUNTANT') },
    ],
  },
  {
    title: 'Vie scolaire',
    items: [
      { href: '/library', label: 'Bibliothèque', icon: Library, roles: ADMINS.concat('LIBRARIAN', 'SECRETARY') },
      { href: '/canteen', label: 'Cantine', icon: UtensilsCrossed, roles: ADMINS.concat('SECRETARY') },
      { href: '/transport', label: 'Transport', icon: Bus, roles: ADMINS.concat('SECRETARY', 'DRIVER') },
      { href: '/discipline', label: 'Discipline', icon: ShieldAlert, roles: ADMINS.concat('SUPERVISOR') },
      { href: '/infirmary', label: 'Infirmerie', icon: HeartPulse, roles: ADMINS.concat('NURSE') },
    ],
  },
  {
    title: 'Organisation',
    items: [
      { href: '/communication', label: 'Communication', icon: MessageSquare, roles: STAFF },
      { href: '/reports', label: 'Rapports & exports', icon: BarChart3, roles: ADMINS.concat('ACCOUNTANT') },
      { href: '/subscription', label: 'Abonnement', icon: CreditCard, roles: ADMINS },
      { href: '/settings', label: 'Paramètres', icon: Settings, roles: ADMINS },
    ],
  },
  {
    title: 'Mon espace',
    items: [
      { href: '/portal', label: 'Portail', icon: BookOpen, roles: ['PARENT', 'STUDENT', 'TEACHER'] },
    ],
  },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<ApiUser | null>(null);
  const [school, setSchool] = useState<ApiSchool | null>(null);
  const [dark, setDark] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [search, setSearch] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const u = authStore.user;
    if (!u) {
      router.replace('/login');
      return;
    }
    setUser(u);
    setSchool(authStore.school);
    setDark(document.documentElement.classList.contains('dark'));
    api('/comms/notifications').then((d) => setUnread(d.unread)).catch(() => undefined);
  }, [router]);

  // Raccourci ⌘K / Ctrl+K pour la recherche globale.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const toggleTheme = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle('dark', next);
    localStorage.setItem('scolaris.theme', next ? 'dark' : 'light');
  };

  const sections = useMemo(() => {
    if (!user) return [];
    return NAV_SECTIONS.map((s) => ({
      ...s,
      items: s.items.filter((i) => !i.roles || i.roles.includes(user.role)),
    })).filter((s) => s.items.length > 0);
  }, [user]);

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (search.trim()) router.push(`/students?search=${encodeURIComponent(search.trim())}`);
  };

  if (!user) return null;

  const sidebar = (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center gap-2 px-5 text-lg font-bold">
        <GraduationCap className="text-brand-600" size={24} />
        Scolaris
      </div>
      <div className="mx-4 mb-3 rounded-lg border px-3 py-2 text-xs" style={{ borderColor: 'var(--border)' }}>
        <p className="font-semibold">{school?.name ?? 'Plateforme'}</p>
        <p style={{ color: 'var(--text-muted)' }}>{school?.code}</p>
      </div>
      <nav className="flex-1 overflow-y-auto px-3 pb-4">
        {sections.map((section) => (
          <div key={section.title} className="mb-4">
            <p className="mb-1 px-2 text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
              {section.title}
            </p>
            {section.items.map((item) => {
              const active = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`mb-0.5 flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors ${
                    active
                      ? 'bg-brand-600/10 font-medium text-brand-600 dark:bg-brand-500/15 dark:text-brand-400'
                      : 'hover:bg-black/5 dark:hover:bg-white/5'
                  }`}
                  style={active ? undefined : { color: 'var(--text-secondary)' }}
                >
                  <item.icon size={16} />
                  {item.label}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>
    </div>
  );

  return (
    <div className="flex min-h-screen">
      {/* Sidebar desktop */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 border-r lg:block" style={{ borderColor: 'var(--border)', background: 'var(--surface-1)' }}>
        {sidebar}
      </aside>
      {/* Sidebar mobile */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setSidebarOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-64 border-r" style={{ borderColor: 'var(--border)', background: 'var(--surface-1)' }}>
            <button className="absolute right-3 top-4 p-1" onClick={() => setSidebarOpen(false)} aria-label="Fermer le menu">
              <X size={18} />
            </button>
            {sidebar}
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col lg:pl-60">
        {/* Barre supérieure */}
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b px-4 backdrop-blur-lg" style={{ borderColor: 'var(--border)', background: 'color-mix(in srgb, var(--surface-0) 85%, transparent)' }}>
          <button className="p-1.5 lg:hidden" onClick={() => setSidebarOpen(true)} aria-label="Ouvrir le menu">
            <Menu size={20} />
          </button>
          <form onSubmit={submitSearch} className="relative hidden max-w-sm flex-1 sm:block">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
            <input
              ref={searchRef}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input pl-9 pr-12"
              placeholder="Rechercher un élève… (Ctrl+K)"
            />
          </form>
          <div className="ml-auto flex items-center gap-1.5">
            <button onClick={toggleTheme} className="rounded-lg p-2 hover:bg-black/5 dark:hover:bg-white/10" aria-label="Basculer le thème" title="Thème clair/sombre">
              {dark ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <Link href="/communication" className="relative rounded-lg p-2 hover:bg-black/5 dark:hover:bg-white/10" aria-label="Notifications">
              <Bell size={18} />
              {unread > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand-600 px-1 text-[10px] font-bold text-white">
                  {unread > 9 ? '9+' : unread}
                </span>
              )}
            </Link>
            <div className="mx-1 h-6 w-px" style={{ background: 'var(--border)' }} />
            <Link href="/settings/profile" className="flex items-center gap-2 rounded-lg p-1.5 hover:bg-black/5 dark:hover:bg-white/10">
              <Avatar name={`${user.firstName} ${user.lastName}`} photoUrl={user.avatarUrl} size={28} />
              <span className="hidden text-sm md:block">
                <span className="block font-medium leading-tight">{user.firstName} {user.lastName}</span>
                <span className="block text-[11px] leading-tight" style={{ color: 'var(--text-muted)' }}>{ROLE_LABELS[user.role] ?? user.role}</span>
              </span>
            </Link>
            <button onClick={() => authStore.logout()} className="rounded-lg p-2 hover:bg-black/5 dark:hover:bg-white/10" aria-label="Se déconnecter" title="Se déconnecter">
              <LogOut size={17} />
            </button>
          </div>
        </header>

        <main className="mx-auto w-full max-w-7xl flex-1 p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
