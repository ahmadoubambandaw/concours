import { describe, expect, it } from 'vitest';
import { hasPermission } from './permissions';

describe('hasPermission (RBAC)', () => {
  it("SCHOOL_ADMIN a tous les droits de l'établissement", () => {
    expect(hasPermission('SCHOOL_ADMIN', 'students', 'delete')).toBe(true);
    expect(hasPermission('SCHOOL_ADMIN', 'payments', 'create')).toBe(true);
  });

  it('TEACHER peut saisir des notes mais pas créer de paiements', () => {
    expect(hasPermission('TEACHER', 'grades', 'create')).toBe(true);
    expect(hasPermission('TEACHER', 'payments', 'create')).toBe(false);
    expect(hasPermission('TEACHER', 'students', 'delete')).toBe(false);
  });

  it('PARENT est limité à la consultation et au paiement', () => {
    expect(hasPermission('PARENT', 'reportCards', 'read')).toBe(true);
    expect(hasPermission('PARENT', 'payments', 'create')).toBe(true);
    expect(hasPermission('PARENT', 'grades', 'create')).toBe(false);
  });

  it('ACCOUNTANT gère les finances mais pas les notes', () => {
    expect(hasPermission('ACCOUNTANT', 'invoices', 'create')).toBe(true);
    expect(hasPermission('ACCOUNTANT', 'grades', 'create')).toBe(false);
  });

  it('les ajouts individuels (+) accordent une permission', () => {
    expect(hasPermission('SECRETARY', 'payments', 'create')).toBe(false);
    expect(hasPermission('SECRETARY', 'payments', 'create', ['+payments:create'])).toBe(true);
  });

  it('les retraits individuels (−) priment sur le rôle', () => {
    expect(hasPermission('SCHOOL_ADMIN', 'students', 'delete', ['-students:delete'])).toBe(false);
  });

  it('DIRECTOR peut valider des paiements mais pas en supprimer', () => {
    expect(hasPermission('DIRECTOR', 'payments', 'validate')).toBe(true);
    expect(hasPermission('DIRECTOR', 'payments', 'delete')).toBe(false);
  });
});
