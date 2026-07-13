'use client';

// Éditeur d'utilisateur : rôle, statut et permissions fines.
// Les permissions cochées reflètent l'effet réel (droits du rôle ±
// ajustements individuels). Décocher/cocher une case qui diffère du rôle
// crée un ajustement (« -ressource:action » ou « +ressource:action ») ;
// revenir à la valeur du rôle le supprime.

import { useCallback, useEffect, useState } from 'react';
import { RotateCcw } from 'lucide-react';
import { api } from '@/lib/api';
import { Field, Modal } from '@/components/ui';
import { ROLE_LABELS } from '@/lib/format';

const ACTION_LABELS: Record<string, string> = {
  read: 'Voir', create: 'Créer', update: 'Modifier', delete: 'Supprimer', validate: 'Valider',
};
const STATUS_LABELS: Record<string, string> = { ACTIVE: 'Actif', INACTIVE: 'Inactif', LOCKED: 'Verrouillé' };
const ASSIGNABLE_ROLES = Object.keys(ROLE_LABELS).filter((r) => r !== 'SUPER_ADMIN');

interface ResourceDef { key: string; label: string; group: string; actions: string[]; }

export const UserEditor = ({
  user,
  isSelf,
  onClose,
  onSaved,
}: {
  user: any;
  isSelf: boolean;
  onClose: () => void;
  onSaved: () => void;
}) => {
  const [role, setRole] = useState<string>(user.role);
  const [status, setStatus] = useState<string>(user.status ?? 'ACTIVE');
  const [overrides, setOverrides] = useState<string[]>(user.permissionOverrides ?? []);
  const [catalog, setCatalog] = useState<{ resources: ResourceDef[]; roleDefaults: Record<string, boolean> } | null>(null);
  const [showPerms, setShowPerms] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const loadCatalog = useCallback((r: string) => {
    api(`/schools/permissions/catalog?role=${r}`).then(setCatalog).catch(() => undefined);
  }, []);
  useEffect(() => { loadCatalog(role); }, [role, loadCatalog]);

  const effective = (pair: string): boolean => {
    if (overrides.includes(`-${pair}`)) return false;
    if (overrides.includes(`+${pair}`)) return true;
    return catalog?.roleDefaults[pair] ?? false;
  };
  const isOverridden = (pair: string) => overrides.includes(`+${pair}`) || overrides.includes(`-${pair}`);

  const toggle = (pair: string) => {
    const next = !effective(pair);
    const roleDefault = catalog?.roleDefaults[pair] ?? false;
    const cleaned = overrides.filter((o) => o !== `+${pair}` && o !== `-${pair}`);
    if (next === roleDefault) setOverrides(cleaned);
    else setOverrides([...cleaned, (next ? '+' : '-') + pair]);
  };

  const save = async () => {
    setSaving(true);
    setError('');
    try {
      await api(`/schools/users/${user.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          ...(isSelf ? {} : { role, status }),
          permissionOverrides: overrides,
        }),
      });
      onSaved();
      onClose();
    } catch (err: any) {
      setError(err.message);
      setSaving(false);
    }
  };

  const groups = Array.from(new Set((catalog?.resources ?? []).map((r) => r.group)));

  return (
    <Modal open onClose={onClose} title={`${user.firstName} ${user.lastName}`} wide>
      <div className="space-y-4">
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{user.email}</p>

        {isSelf && (
          <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:bg-amber-950 dark:text-amber-200">
            Vous ne pouvez pas modifier votre propre rôle ni votre statut (sécurité anti-verrouillage).
          </p>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Rôle">
            <select className="input" value={role} disabled={isSelf} onChange={(e) => { setRole(e.target.value); }}>
              {ASSIGNABLE_ROLES.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
            </select>
          </Field>
          <Field label="Statut">
            <select className="input" value={status} disabled={isSelf} onChange={(e) => setStatus(e.target.value)}>
              {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </Field>
        </div>

        {/* Permissions avancées */}
        <div className="rounded-lg border" style={{ borderColor: 'var(--border)' }}>
          <button
            type="button"
            onClick={() => setShowPerms((s) => !s)}
            className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium"
          >
            <span>Permissions avancées {overrides.length > 0 && <span className="ml-1 rounded-full bg-brand-600/15 px-2 py-0.5 text-xs text-brand-600">{overrides.length} ajustement(s)</span>}</span>
            <span style={{ color: 'var(--text-muted)' }}>{showPerms ? '▲' : '▼'}</span>
          </button>

          {showPerms && (
            <div className="border-t p-4" style={{ borderColor: 'var(--border)' }}>
              <div className="mb-3 flex items-center justify-between">
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  Les cases reflètent les droits effectifs. Un point bleu = ajustement par rapport au rôle {ROLE_LABELS[role]}.
                </p>
                {overrides.length > 0 && (
                  <button type="button" className="btn-secondary !px-2.5 !py-1 text-xs" onClick={() => setOverrides([])}>
                    <RotateCcw size={12} /> Réinitialiser sur le rôle
                  </button>
                )}
              </div>

              {!catalog ? (
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Chargement…</p>
              ) : (
                <div className="max-h-[22rem] space-y-4 overflow-y-auto pr-1">
                  {groups.map((group) => (
                    <div key={group}>
                      <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>{group}</p>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <tbody>
                            {catalog.resources.filter((r) => r.group === group).map((r) => (
                              <tr key={r.key} className="border-b last:border-0" style={{ borderColor: 'var(--border)' }}>
                                <td className="py-1.5 pr-3 font-medium">{r.label}</td>
                                {(['read', 'create', 'update', 'delete', 'validate'] as const).map((a) => {
                                  const pair = `${r.key}:${a}`;
                                  if (!r.actions.includes(a)) return <td key={a} className="px-2" />;
                                  return (
                                    <td key={a} className="px-2 py-1.5 text-center">
                                      <label className="relative inline-flex cursor-pointer flex-col items-center gap-0.5">
                                        <input
                                          type="checkbox"
                                          checked={effective(pair)}
                                          onChange={() => toggle(pair)}
                                          className="h-4 w-4 accent-brand-600"
                                        />
                                        <span className="text-[9px]" style={{ color: 'var(--text-muted)' }}>{ACTION_LABELS[a]}</span>
                                        {isOverridden(pair) && <span className="absolute -right-1.5 top-0 h-1.5 w-1.5 rounded-full bg-brand-500" />}
                                      </label>
                                    </td>
                                  );
                                })}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {error && <p className="text-sm text-red-500">{error}</p>}
        <button className="btn-primary w-full" disabled={saving} onClick={save}>
          {saving ? 'Enregistrement…' : 'Enregistrer'}
        </button>
      </div>
    </Modal>
  );
};
