import { BITACORA_ROLES } from '../config/constants';

const CAPABILITY_ALIASES = {
  view: ['bitacora.view', 'bitacora.ver', 'bitacora.read'],
  create: ['bitacora.create', 'bitacora.crear', 'bitacora.actividad.crear'],
  edit: [
    'bitacora.edit',
    'bitacora.editar',
    'bitacora.actividad.editar',
    'bitacora.report.edit',
  ],
  schedule: ['bitacora.schedule', 'bitacora.programar'],
  review: ['bitacora.review', 'bitacora.revisar', 'bitacora.control_documental'],
  submit: ['bitacora.submit', 'bitacora.enviar', 'bitacora.documentacion.enviar'],
  agreements: ['bitacora.agreements.manage', 'bitacora.acuerdos.gestionar'],
  evidence: ['bitacora.evidence.manage', 'bitacora.evidencias.gestionar'],
  complete: ['bitacora.complete', 'bitacora.completar'],
  reopen: ['bitacora.reopen', 'bitacora.reabrir'],
  manageParticipants: [
    'bitacora.participants.manage',
    'bitacora.participantes.gestionar',
    'bitacora.programar',
  ],
  notifications: ['bitacora.notifications', 'bitacora.notificaciones'],
};

export function userRoles(user) {
  const roles = Array.isArray(user?.roles) ? user.roles.filter(Boolean) : [];
  if (user?.rol) roles.push(user.rol);
  return [...new Set(roles)];
}

export function userPermissions(user) {
  return Array.isArray(user?.permissions) ? user.permissions.filter(Boolean) : [];
}

export function isAdmin(user) {
  return Boolean(user?.es_admin) || user?.rol === 'admin' || userRoles(user).includes('admin');
}

export function hasAnyRole(user, roles) {
  const actual = userRoles(user);
  return roles.some((role) => actual.includes(role));
}

export function hasAnyPermission(user, permissions) {
  if (isAdmin(user)) return true;
  const actual = userPermissions(user);
  return permissions.some((permission) => actual.includes(permission));
}

export function canAccessBitacora(user) {
  if (isAdmin(user)) return true;
  if (
    hasAnyRole(user, [
      BITACORA_ROLES.ASISTENTE,
      BITACORA_ROLES.DIRECTOR,
      BITACORA_ROLES.SECRETARIA,
    ])
  ) {
    return true;
  }
  return userPermissions(user).some((permission) => permission.startsWith('bitacora.'));
}

export function hasBitacoraCapability(user, capability) {
  const aliases = CAPABILITY_ALIASES[capability] || [capability];
  const permissions = userPermissions(user);

  // Cuando el backend entrega permisos, estos mandan sobre la inferencia visual.
  if (permissions.length > 0) {
    return aliases.some((permission) => permissions.includes(permission));
  }

  // Compatibilidad con administradores antiguos mientras reciben permisos
  // explícitos desde el backend nuevo.
  if (isAdmin(user)) return true;

  // Compatibilidad durante la migracion de cuentas existentes.
  const roles = userRoles(user);
  const isSecretary = roles.includes(BITACORA_ROLES.SECRETARIA);
  const isCollaborator =
    roles.includes(BITACORA_ROLES.ASISTENTE) || roles.includes(BITACORA_ROLES.DIRECTOR);

  if (capability === 'view' || capability === 'notifications') return isSecretary || isCollaborator;
  if (capability === 'review') return isSecretary;
  if (capability === 'complete' || capability === 'reopen') return isSecretary;
  if (capability === 'schedule' || capability === 'manageParticipants') {
    return isSecretary || isCollaborator;
  }
  if (
    capability === 'create'
    || capability === 'edit'
    || capability === 'submit'
    || capability === 'agreements'
    || capability === 'evidence'
  ) {
    return isSecretary || isCollaborator;
  }
  return false;
}

export function isBitacoraSecretary(user) {
  if (userPermissions(user).length > 0) return hasBitacoraCapability(user, 'review');
  return hasAnyRole(user, [BITACORA_ROLES.SECRETARIA]);
}
