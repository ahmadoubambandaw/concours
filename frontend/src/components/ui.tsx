'use client';

// Bibliothèque de composants UI Scolaris — cartes, boutons, badges,
// tableaux, modales, états vides. Style inspiré de Linear/Notion/Stripe.

import { X } from 'lucide-react';
import { type ReactNode, useEffect } from 'react';

export const Card = ({ children, className = '' }: { children: ReactNode; className?: string }) => (
  <div className={`card ${className}`}>{children}</div>
);

export const CardHeader = ({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) => (
  <div className="flex items-start justify-between gap-4 border-b px-5 py-4" style={{ borderColor: 'var(--border)' }}>
    <div>
      <h3 className="text-sm font-semibold">{title}</h3>
      {subtitle && <p className="mt-0.5 text-xs" style={{ color: 'var(--text-muted)' }}>{subtitle}</p>}
    </div>
    {action}
  </div>
);

const BADGE_STYLES: Record<string, string> = {
  green: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300',
  red: 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300',
  yellow: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300',
  blue: 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300',
  gray: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  violet: 'bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-300',
};

export const Badge = ({ children, color = 'gray' }: { children: ReactNode; color?: string }) => (
  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${BADGE_STYLES[color] ?? BADGE_STYLES.gray}`}>
    {children}
  </span>
);

export const STATUS_BADGES: Record<string, { label: string; color: string }> = {
  ACTIVE: { label: 'Actif', color: 'green' },
  INACTIVE: { label: 'Inactif', color: 'gray' },
  PAID: { label: 'Payée', color: 'green' },
  PARTIALLY_PAID: { label: 'Partiel', color: 'yellow' },
  SENT: { label: 'En attente', color: 'blue' },
  OVERDUE: { label: 'En retard', color: 'red' },
  CANCELLED: { label: 'Annulée', color: 'gray' },
  PENDING: { label: 'En attente', color: 'yellow' },
  APPROVED: { label: 'Approuvée', color: 'green' },
  REJECTED: { label: 'Rejetée', color: 'red' },
  CONVERTED: { label: 'Convertie', color: 'violet' },
  PRESENT: { label: 'Présent', color: 'green' },
  ABSENT: { label: 'Absent', color: 'red' },
  LATE: { label: 'Retard', color: 'yellow' },
  EXCUSED: { label: 'Excusé', color: 'blue' },
  PUBLISHED: { label: 'Publié', color: 'green' },
  DRAFT: { label: 'Brouillon', color: 'gray' },
  ONGOING: { label: 'En cours', color: 'blue' },
  RETURNED: { label: 'Rendu', color: 'green' },
  LOST: { label: 'Perdu', color: 'red' },
  COMPLETED: { label: 'Terminé', color: 'green' },
  PLANNED: { label: 'Planifié', color: 'blue' },
  TRIAL: { label: 'Essai', color: 'yellow' },
  SUSPENDED: { label: 'Suspendu', color: 'red' },
};

export const StatusBadge = ({ status }: { status: string }) => {
  const def = STATUS_BADGES[status] ?? { label: status, color: 'gray' };
  return <Badge color={def.color}>{def.label}</Badge>;
};

export const Spinner = () => (
  <div className="flex items-center justify-center p-10">
    <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
  </div>
);

export const EmptyState = ({ title, hint }: { title: string; hint?: string }) => (
  <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
    <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>{title}</p>
    {hint && <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>{hint}</p>}
  </div>
);

export const PageHeader = ({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) => (
  <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
    <div>
      <h1 className="text-xl font-bold tracking-tight">{title}</h1>
      {subtitle && <p className="mt-0.5 text-sm" style={{ color: 'var(--text-muted)' }}>{subtitle}</p>}
    </div>
    {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
  </div>
);

export interface Column<T> {
  key: string;
  header: string;
  render?: (row: T) => ReactNode;
  className?: string;
}

export function DataTable<T extends { id?: string }>({
  columns,
  rows,
  onRowClick,
  emptyLabel = 'Aucune donnée',
}: {
  columns: Column<T>[];
  rows: T[];
  onRowClick?: (row: T) => void;
  emptyLabel?: string;
}) {
  if (rows.length === 0) return <EmptyState title={emptyLabel} />;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left" style={{ borderColor: 'var(--border)' }}>
            {columns.map((col) => (
              <th
                key={col.key}
                className={`whitespace-nowrap px-4 py-2.5 text-xs font-semibold uppercase tracking-wide ${col.className ?? ''}`}
                style={{ color: 'var(--text-muted)' }}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr
              key={row.id ?? i}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              className={`border-b transition-colors last:border-0 ${onRowClick ? 'cursor-pointer hover:bg-black/[0.025] dark:hover:bg-white/[0.04]' : ''}`}
              style={{ borderColor: 'var(--border)' }}
            >
              {columns.map((col) => (
                <td key={col.key} className={`px-4 py-3 ${col.className ?? ''}`}>
                  {col.render ? col.render(row) : String((row as any)[col.key] ?? '—')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export const Modal = ({
  open,
  onClose,
  title,
  children,
  wide = false,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  wide?: boolean;
}) => {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    if (open) window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm" onClick={onClose}>
      <div
        className={`card max-h-[90vh] w-full overflow-y-auto ${wide ? 'max-w-3xl' : 'max-w-lg'} animate-fade-in-up`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b px-5 py-4" style={{ borderColor: 'var(--border)' }}>
          <h3 className="text-sm font-semibold">{title}</h3>
          <button onClick={onClose} className="rounded-lg p-1 hover:bg-black/5 dark:hover:bg-white/10" aria-label="Fermer">
            <X size={16} />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
};

export const Field = ({ label, children, required }: { label: string; children: ReactNode; required?: boolean }) => (
  <label className="block">
    <span className="mb-1 block text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
      {label} {required && <span className="text-red-500">*</span>}
    </span>
    {children}
  </label>
);

export const Avatar = ({ name, photoUrl, size = 32 }: { name: string; photoUrl?: string | null; size?: number }) => {
  const initials = name
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
  if (photoUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={photoUrl} alt={name} width={size} height={size} className="rounded-full object-cover" style={{ width: size, height: size }} />;
  }
  return (
    <div
      className="flex items-center justify-center rounded-full bg-brand-100 font-semibold text-brand-700 dark:bg-brand-950 dark:text-brand-300"
      style={{ width: size, height: size, fontSize: size * 0.36 }}
    >
      {initials}
    </div>
  );
};
