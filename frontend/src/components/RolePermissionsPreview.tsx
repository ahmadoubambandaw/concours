'use client';

// Aperçu (lecture seule) des accès automatiquement attribués à une
// fonction. Utilisé pendant la création d'un compte : dès qu'on choisit
// le rôle, l'app affiche les permissions que la matrice RBAC lui accorde.
// Aucun réglage manuel — la fonction détermine les permissions.

import { useEffect, useState } from 'react';
import { Check } from 'lucide-react';
import { api } from '@/lib/api';
import { ROLE_LABELS } from '@/lib/format';

const ACTION_LABELS: Record<string, string> = {
  read: 'Voir', create: 'Créer', update: 'Modifier', delete: 'Supprimer', validate: 'Valider',
};

interface ResourceDef { key: string; label: string; group: string; actions: string[]; }
interface Catalog { resources: ResourceDef[]; roleDefaults: Record<string, boolean>; }

export const RolePermissionsPreview = ({ role }: { role?: string }) => {
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!role) return;
    setLoading(true);
    api(`/schools/permissions/catalog?role=${role}`)
      .then(setCatalog)
      .catch(() => setCatalog(null))
      .finally(() => setLoading(false));
  }, [role]);

  if (!role) return null;

  // Ne garder que les ressources sur lesquelles la fonction a au moins un droit.
  const granted = (catalog?.resources ?? [])
    .map((r) => ({
      ...r,
      allowed: r.actions.filter((a) => catalog?.roleDefaults[`${r.key}:${a}`]),
    }))
    .filter((r) => r.allowed.length > 0);

  const groups = Array.from(new Set(granted.map((r) => r.group)));

  return (
    <div className="rounded-lg border p-3" style={{ borderColor: 'var(--border)', background: 'var(--surface-2)' }}>
      <div className="mb-2 flex items-center gap-1.5 text-xs font-medium">
        <Check size={13} className="text-emerald-600" />
        <span>Accès attribués automatiquement à la fonction «&nbsp;{ROLE_LABELS[role] ?? role}&nbsp;»</span>
      </div>

      {loading && !catalog ? (
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Chargement…</p>
      ) : granted.length === 0 ? (
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Aucun accès particulier.</p>
      ) : (
        <div className="max-h-52 space-y-2.5 overflow-y-auto pr-1">
          {groups.map((group) => (
            <div key={group}>
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>{group}</p>
              <div className="flex flex-wrap gap-1.5">
                {granted.filter((r) => r.group === group).map((r) => (
                  <span
                    key={r.key}
                    className="inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[11px]"
                    style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
                    title={r.allowed.map((a) => ACTION_LABELS[a] ?? a).join(', ')}
                  >
                    <span className="font-medium">{r.label}</span>
                    <span style={{ color: 'var(--text-muted)' }}>
                      {r.allowed.map((a) => ACTION_LABELS[a] ?? a).join(' · ')}
                    </span>
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="mt-2 text-[10px]" style={{ color: 'var(--text-muted)' }}>
        Vous pourrez ajuster finement ces permissions après la création, en cliquant sur l&apos;utilisateur.
      </p>
    </div>
  );
};
