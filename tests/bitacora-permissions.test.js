import { describe, expect, it } from 'vitest';
import {
  canAccessBitacora,
  hasBitacoraCapability,
  isBitacoraSecretary,
  userRoles,
} from '../src/lib/permissions';

describe('RBAC visual de Bitácora', () => {
  it('permite acceso a los tres roles de dominio', () => {
    for (const role of ['bitacora.asistente', 'bitacora.director', 'bitacora.secretaria']) {
      expect(canAccessBitacora({ rol: 'personal', roles: [role] })).toBe(true);
    }
    expect(canAccessBitacora({ rol: 'personal', roles: [] })).toBe(false);
  });

  it('usa permissions[] como autoridad cuando el backend las entrega', () => {
    const adminReadOnly = {
      rol: 'admin',
      roles: ['admin'],
      permissions: ['bitacora.read'],
    };
    expect(hasBitacoraCapability(adminReadOnly, 'view')).toBe(true);
    expect(hasBitacoraCapability(adminReadOnly, 'create')).toBe(false);
    expect(isBitacoraSecretary(adminReadOnly)).toBe(false);
  });

  it('identifica a Secretaría por permiso de revisión y conserva rol base', () => {
    const teresa = {
      rol: 'personal',
      roles: ['bitacora.secretaria'],
      permissions: ['bitacora.read', 'bitacora.review'],
    };
    expect(isBitacoraSecretary(teresa)).toBe(true);
    expect(userRoles(teresa)).toEqual(expect.arrayContaining(['personal', 'bitacora.secretaria']));
  });

  it('reconoce los permisos operativos canónicos del backend', () => {
    const assistant = {
      rol: 'personal',
      roles: ['bitacora.asistente'],
      permissions: [
        'bitacora.report.edit',
        'bitacora.agreements.manage',
        'bitacora.evidence.manage',
      ],
    };
    expect(hasBitacoraCapability(assistant, 'edit')).toBe(true);
    expect(hasBitacoraCapability(assistant, 'agreements')).toBe(true);
    expect(hasBitacoraCapability(assistant, 'evidence')).toBe(true);
  });
});
