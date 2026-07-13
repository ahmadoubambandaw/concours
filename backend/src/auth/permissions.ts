// ============================================================
// RBAC — permissions fines par rôle.
//
// Une permission s'écrit `resource:action` avec pour actions :
//   read | create | update | delete | validate
// Les jokers sont autorisés : `students:*`, `*:read`, `*:*`.
//
// Chaque utilisateur peut en plus recevoir des ajustements
// individuels via `permissionOverrides` :
//   ["+payments:create", "-students:delete"]
// ============================================================

import type { Role } from '@prisma/client';

export type Action = 'read' | 'create' | 'update' | 'delete' | 'validate';

const ALL = '*:*';

export const ROLE_PERMISSIONS: Record<Role, string[]> = {
  // Opérateur du SaaS : tout, y compris la gestion des établissements.
  SUPER_ADMIN: [ALL, 'platform:*'],

  // Administrateur d'établissement : tout au sein de son école.
  SCHOOL_ADMIN: [ALL],

  // Directeur (primaire) / Proviseur (lycée) : pilotage complet sauf
  // suppression des données financières.
  DIRECTOR: [
    '*:read',
    'students:*', 'teachers:*', 'guardians:*', 'classes:*', 'subjects:*',
    'levels:*', 'academicYears:*', 'enrollments:*', 'preregistrations:*',
    'attendance:*', 'grades:*', 'reportCards:*', 'deliberations:*',
    'timetable:*', 'exams:*', 'homework:*', 'discipline:*',
    'communication:*', 'documents:*', 'events:*', 'hr:*',
    'payments:validate', 'invoices:validate', 'reports:read', 'ai:read',
    'settings:update', 'users:create', 'users:update',
  ],
  PRINCIPAL: [
    '*:read',
    'students:*', 'teachers:*', 'guardians:*', 'classes:*', 'subjects:*',
    'levels:*', 'academicYears:*', 'enrollments:*', 'preregistrations:*',
    'attendance:*', 'grades:*', 'reportCards:*', 'deliberations:*',
    'timetable:*', 'exams:*', 'homework:*', 'discipline:*',
    'communication:*', 'documents:*', 'events:*', 'hr:*',
    'payments:validate', 'invoices:validate', 'reports:read', 'ai:read',
    'settings:update', 'users:create', 'users:update',
  ],

  // Comptable : finances + lecture des dossiers.
  ACCOUNTANT: [
    'dashboard:read', 'students:read', 'guardians:read', 'classes:read',
    'enrollments:read', 'fees:*', 'invoices:*', 'payments:*',
    'expenses:*', 'incomes:*', 'accounting:*', 'hr:read', 'payroll:*',
    'reports:read', 'documents:read', 'documents:create',
  ],

  // Secrétaire : dossiers administratifs, inscriptions, communication.
  SECRETARY: [
    'dashboard:read', 'students:read', 'students:create', 'students:update',
    'guardians:*', 'preregistrations:*', 'enrollments:*',
    'classes:read', 'levels:read', 'academicYears:read',
    'attendance:read', 'documents:*', 'communication:*', 'events:*',
    'invoices:read', 'payments:read', 'timetable:read', 'teachers:read',
  ],

  // Enseignant : ses classes — notes, présences, cahier de texte.
  TEACHER: [
    'dashboard:read', 'students:read', 'classes:read', 'subjects:read',
    'attendance:read', 'attendance:create', 'attendance:update',
    'grades:*', 'assessments:*', 'homework:*', 'reportCards:read',
    'timetable:read', 'exams:read', 'documents:read', 'documents:create',
    'communication:read', 'communication:create', 'events:read',
  ],

  // Parent : suivi de ses enfants uniquement (filtré par le service).
  PARENT: [
    'portal:read', 'grades:read', 'reportCards:read', 'attendance:read',
    'invoices:read', 'payments:read', 'payments:create', 'homework:read',
    'timetable:read', 'events:read', 'communication:read', 'communication:create',
    'canteen:read', 'transport:read',
  ],

  // Élève : consultation de son propre dossier.
  STUDENT: [
    'portal:read', 'grades:read', 'reportCards:read', 'homework:read',
    'timetable:read', 'events:read', 'attendance:read', 'library:read',
    'communication:read',
  ],

  LIBRARIAN: [
    'dashboard:read', 'students:read', 'library:*', 'documents:read',
    'communication:read', 'events:read',
  ],

  // Surveillant : présences et discipline.
  SUPERVISOR: [
    'dashboard:read', 'students:read', 'classes:read',
    'attendance:*', 'discipline:*', 'timetable:read', 'events:read',
    'communication:read', 'communication:create',
  ],

  NURSE: [
    'dashboard:read', 'students:read', 'infirmary:*', 'communication:read',
  ],

  DRIVER: [
    'transport:read', 'students:read', 'events:read',
  ],
};

const matches = (granted: string, wanted: string): boolean => {
  const [gRes, gAct] = granted.split(':');
  const [wRes, wAct] = wanted.split(':');
  return (gRes === '*' || gRes === wRes) && (gAct === '*' || gAct === wAct);
};

/**
 * Vérifie qu'un rôle (avec d'éventuels ajustements individuels)
 * possède la permission `resource:action`.
 */
export const hasPermission = (
  role: Role,
  resource: string,
  action: Action,
  overrides: string[] = [],
): boolean => {
  const wanted = `${resource}:${action}`;
  // Les retraits explicites priment sur tout le reste.
  if (overrides.some((o) => o.startsWith('-') && matches(o.slice(1), wanted))) return false;
  if (overrides.some((o) => o.startsWith('+') && matches(o.slice(1), wanted))) return true;
  return (ROLE_PERMISSIONS[role] ?? []).some((granted) => matches(granted, wanted));
};

// ------------------------------------------------------------
// Catalogue des permissions — pour l'éditeur d'administration.
// Chaque ressource liste les actions qui ont un sens pour elle.
// ------------------------------------------------------------

export interface ResourceDef {
  key: string;
  label: string;
  group: string;
  actions: Action[];
}

const CRUD: Action[] = ['read', 'create', 'update', 'delete'];

export const RESOURCE_CATALOG: ResourceDef[] = [
  { key: 'dashboard', label: 'Tableau de bord', group: 'Pilotage', actions: ['read'] },
  { key: 'ai', label: 'Assistant IA', group: 'Pilotage', actions: ['read'] },
  { key: 'reports', label: 'Rapports & exports', group: 'Pilotage', actions: ['read'] },

  { key: 'students', label: 'Élèves', group: 'Scolarité', actions: CRUD },
  { key: 'guardians', label: 'Parents / tuteurs', group: 'Scolarité', actions: CRUD },
  { key: 'teachers', label: 'Enseignants', group: 'Scolarité', actions: CRUD },
  { key: 'classes', label: 'Classes & salles', group: 'Scolarité', actions: CRUD },
  { key: 'subjects', label: 'Matières', group: 'Scolarité', actions: CRUD },
  { key: 'levels', label: 'Niveaux', group: 'Scolarité', actions: CRUD },
  { key: 'academicYears', label: 'Années scolaires', group: 'Scolarité', actions: [...CRUD, 'validate'] },
  { key: 'preregistrations', label: 'Pré-inscriptions', group: 'Scolarité', actions: CRUD },
  { key: 'enrollments', label: 'Inscriptions', group: 'Scolarité', actions: CRUD },

  { key: 'attendance', label: 'Présences', group: 'Vie scolaire', actions: ['read', 'create', 'update'] },
  { key: 'grades', label: 'Notes', group: 'Scolarité', actions: CRUD },
  { key: 'assessments', label: 'Évaluations', group: 'Scolarité', actions: CRUD },
  { key: 'reportCards', label: 'Bulletins', group: 'Scolarité', actions: ['read', 'create', 'validate'] },
  { key: 'deliberations', label: 'Délibérations', group: 'Scolarité', actions: ['read', 'create'] },
  { key: 'timetable', label: 'Emplois du temps', group: 'Scolarité', actions: CRUD },
  { key: 'exams', label: 'Examens', group: 'Scolarité', actions: CRUD },
  { key: 'homework', label: 'Cahier de texte', group: 'Scolarité', actions: CRUD },
  { key: 'events', label: 'Calendrier', group: 'Scolarité', actions: CRUD },

  { key: 'fees', label: 'Grille de frais', group: 'Finances', actions: CRUD },
  { key: 'invoices', label: 'Factures', group: 'Finances', actions: ['read', 'create', 'validate'] },
  { key: 'payments', label: 'Paiements', group: 'Finances', actions: ['read', 'create', 'validate'] },
  { key: 'expenses', label: 'Dépenses', group: 'Finances', actions: CRUD },
  { key: 'incomes', label: 'Recettes', group: 'Finances', actions: CRUD },
  { key: 'accounting', label: 'Comptabilité', group: 'Finances', actions: ['read'] },
  { key: 'hr', label: 'RH (personnel, congés)', group: 'Finances', actions: [...CRUD, 'validate'] },
  { key: 'payroll', label: 'Paie', group: 'Finances', actions: CRUD },

  { key: 'library', label: 'Bibliothèque', group: 'Vie scolaire', actions: CRUD },
  { key: 'canteen', label: 'Cantine', group: 'Vie scolaire', actions: ['read', 'create'] },
  { key: 'transport', label: 'Transport', group: 'Vie scolaire', actions: CRUD },
  { key: 'discipline', label: 'Discipline', group: 'Vie scolaire', actions: CRUD },
  { key: 'infirmary', label: 'Infirmerie', group: 'Vie scolaire', actions: CRUD },

  { key: 'communication', label: 'Communication', group: 'Organisation', actions: ['read', 'create'] },
  { key: 'documents', label: 'Documents', group: 'Organisation', actions: CRUD },
  { key: 'users', label: 'Utilisateurs', group: 'Organisation', actions: ['read', 'create', 'update'] },
  { key: 'settings', label: 'Paramètres', group: 'Organisation', actions: ['update'] },
  { key: 'audit', label: "Journal d'audit", group: 'Organisation', actions: ['read'] },
];

/** Matrice { "resource:action": booléen } accordée par un rôle (sans overrides). */
export const roleDefaults = (role: Role): Record<string, boolean> => {
  const out: Record<string, boolean> = {};
  for (const res of RESOURCE_CATALOG) {
    for (const action of res.actions) {
      out[`${res.key}:${action}`] = hasPermission(role, res.key, action, []);
    }
  }
  return out;
};
