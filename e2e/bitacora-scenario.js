const API_ORIGIN = 'http://api.invalid';
const CREATED_AT = '2026-07-21T20:58:27.790Z';

const COLLABORATOR_PERMISSIONS = [
  'bitacora.read',
  'bitacora.create',
  'bitacora.edit',
  'bitacora.schedule',
  'bitacora.participants.manage',
  'bitacora.agreements.manage',
  'bitacora.evidence.manage',
  'bitacora.submit',
];

const SECRETARY_PERMISSIONS = [
  'bitacora.read',
  'bitacora.create',
  'bitacora.schedule',
  'bitacora.schedule.control',
  'bitacora.participants.manage',
  'bitacora.review',
  'bitacora.complete',
  'bitacora.reopen',
];

export function tokenFor(user) {
  const encode = (value) => Buffer.from(JSON.stringify(value)).toString('base64url');
  return `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode({
    sub: String(user.id),
    exp: Math.floor(Date.now() / 1000) + 3600,
  })}.isolated-e2e-signature`;
}

export function userFor(role, overrides = {}) {
  const users = {
    assistant: {
      id: 11,
      username: 'browser.assistant',
      nombre_completo: 'Asistente de Navegador',
      rol: 'personal',
      roles: ['bitacora.asistente'],
      permissions: COLLABORATOR_PERMISSIONS,
    },
    director: {
      id: 13,
      username: 'browser.director',
      nombre_completo: 'Director de Navegador',
      rol: 'personal',
      roles: ['bitacora.director'],
      permissions: COLLABORATOR_PERMISSIONS,
    },
    secretary: {
      id: 12,
      username: 'browser.secretary',
      nombre_completo: 'Secretaría de Navegador',
      rol: 'personal',
      roles: ['bitacora.secretaria'],
      permissions: SECRETARY_PERMISSIONS,
    },
    admin: {
      id: 14,
      username: 'browser.admin',
      nombre_completo: 'Administración de Navegador',
      rol: 'admin',
      roles: [],
      permissions: [],
    },
    outsider: {
      id: 15,
      username: 'browser.outsider',
      nombre_completo: 'Cuenta sin Bitácora',
      rol: 'personal',
      roles: [],
      permissions: [],
    },
  };
  return {
    ...users[role],
    password_reset_required: false,
    ...overrides,
  };
}

export function completeActivity(overrides = {}) {
  return {
    id: 101,
    titulo: 'Taller comunitario verificable',
    objetivo: 'Documentar un flujo completo sin datos reales.',
    tipo: 'Taller',
    tipo_valor_id: 2,
    unidad_lugar: 'Unidad E2E aislada',
    modalidad: 'PRESENCIAL',
    inicio_utc: '2026-07-23T15:00:00.000Z',
    fin_utc: '2026-07-23T16:00:00.000Z',
    organizador: 'Equipo automatizado',
    prioridad: 'MEDIA',
    estado_programacion: 'BORRADOR',
    estado_documentacion: 'NO_INICIADA',
    version: 1,
    created_at: CREATED_AT,
    participantes: [{
      id: 1,
      nombre: 'Persona de prueba',
      funcion: 'Asistente',
      convocado: true,
      asistio: true,
    }],
    informe: {
      actor_involucrado: 'Equipo institucional de prueba',
      que_ocurrio: 'Se ejecutó el escenario automatizado previsto.',
      evidencia_disponible: 'Registro textual de prueba sin información personal.',
      dificultades: 'No se presentaron dificultades durante la actividad.',
      solucion: 'No fue necesario aplicar medidas correctivas.',
      aprendizaje: 'El flujo conserva su trazabilidad de extremo a extremo.',
    },
    acuerdos: [{
      id: 501,
      descripcion: 'Verificar el resultado automatizado.',
      responsables: [{ nombre: 'Responsable externo de prueba' }],
      vencimiento_at: '2026-07-30T15:00:00.000Z',
      prioridad: 'MEDIA',
      estado: 'PENDIENTE',
      version: 1,
    }],
    evidencias: [],
    recurrencia: { enabled: false },
    missing_fields: [],
    ...overrides,
  };
}

function json(route, payload, status = 200) {
  return route.fulfill({
    status,
    contentType: 'application/json',
    headers: {
      'Access-Control-Allow-Origin': 'http://127.0.0.1:4173',
      'Access-Control-Allow-Headers':
        'Authorization, Content-Type, Idempotency-Key, If-Match, X-Request-ID',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    },
    body: JSON.stringify(payload),
  });
}

function roleFromUsername(username = '') {
  if (username.includes('secretary')) return 'secretary';
  if (username.includes('director')) return 'director';
  if (username.includes('admin')) return 'admin';
  if (username.includes('outsider')) return 'outsider';
  return 'assistant';
}

function matchesCompleteness(activity) {
  return activity.estado_documentacion !== 'COMPLETA'
    || (activity.missing_fields || []).length > 0;
}

function listActivities(state, url) {
  let items = [...state.activities];
  const query = url.searchParams;
  if (query.get('sin_fecha') === 'true') {
    items = items.filter((activity) => !activity.inicio_at && !activity.inicio_utc);
  } else if (query.has('fecha_desde') || query.has('fecha_hasta')) {
    items = items.filter((activity) => activity.inicio_at || activity.inicio_utc);
  }
  if (query.get('estado_programacion')) {
    items = items.filter((activity) => activity.estado_programacion === query.get('estado_programacion'));
  }
  if (query.get('estado_documentacion')) {
    items = items.filter((activity) => activity.estado_documentacion === query.get('estado_documentacion'));
  }
  if (query.get('estado_documentacion_excluir')) {
    items = items.filter((activity) => activity.estado_documentacion !== query.get('estado_documentacion_excluir'));
  }
  if (query.get('completitud') === 'incompleta') {
    items = items.filter(matchesCompleteness);
  }
  if (query.get('q')) {
    const needle = query.get('q').toLocaleLowerCase('es');
    items = items.filter((activity) => `${activity.titulo} ${activity.objetivo}`.toLocaleLowerCase('es').includes(needle));
  }
  const page = Math.max(1, Number(query.get('page')) || 1);
  const limit = Math.max(1, Number(query.get('limit')) || 20);
  const offset = (page - 1) * limit;
  return { items: items.slice(offset, offset + limit), total: items.length, page, limit };
}

function actionState(activity, action) {
  if (action === 'programar') return { estado_programacion: 'PROGRAMADA' };
  if (action === 'marcar-realizada') {
    return { estado_programacion: 'REALIZADA', estado_documentacion: 'BORRADOR' };
  }
  if (action === 'marcar-no-realizada') return { estado_programacion: 'NO_REALIZADA' };
  if (action === 'cancelar') return { estado_programacion: 'CANCELADA' };
  if (action === 'enviar') return { estado_documentacion: 'ENVIADA' };
  if (action === 'devolver') return { estado_documentacion: 'REQUIERE_CORRECCION' };
  if (action === 'completar') return { estado_documentacion: 'COMPLETA' };
  if (action === 'reabrir') return { estado_documentacion: 'REQUIERE_CORRECCION' };
  return {};
}

export async function installScenarioApi(page, options = {}) {
  const state = {
    activities: structuredClone(options.activities || []),
    notifications: structuredClone(options.notifications || []),
    requests: [],
    nextActivityId: options.nextActivityId || 900,
    currentUser: options.user ? structuredClone(options.user) : null,
    failures: new Map(Object.entries(options.failures || {})),
    conflicts: new Set(options.conflicts || []),
  };

  await page.route(`${API_ORIGIN}/**`, async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const method = request.method();
    const path = url.pathname;
    const requestKey = `${method} ${path}`;

    if (method === 'OPTIONS') {
      await route.fulfill({
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': 'http://127.0.0.1:4173',
          'Access-Control-Allow-Headers':
            'Authorization, Content-Type, Idempotency-Key, If-Match, X-Request-ID',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
        },
      });
      return;
    }

    let body = null;
    if ((request.headers()['content-type'] || '').includes('application/json')) {
      body = request.postDataJSON();
    }
    state.requests.push({ method, path, query: Object.fromEntries(url.searchParams), body, headers: request.headers() });

    const remainingFailures = state.failures.get(requestKey) || 0;
    if (remainingFailures > 0) {
      state.failures.set(requestKey, remainingFailures - 1);
      await json(route, { detail: { code: 'ISOLATED_FAILURE', detail: 'Fallo controlado de la prueba.' } }, 503);
      return;
    }

    if (path === '/api/auth/login' && method === 'POST') {
      const chosen = options.user
        ? structuredClone(options.user)
        : userFor(roleFromUsername(body?.username));
      state.currentUser = chosen;
      await json(route, {
        token: tokenFor(chosen),
        user: chosen,
        password_reset_required: Boolean(chosen.password_reset_required),
      });
      return;
    }
    if (path === '/api/auth/logout' && method === 'POST') {
      await json(route, { ok: true });
      return;
    }
    if (path === '/api/auth/change-password' && method === 'POST') {
      state.currentUser = { ...state.currentUser, password_reset_required: false };
      await json(route, { ok: true });
      return;
    }
    if (path === '/api/auth/me' && method === 'GET') {
      await json(route, { user: state.currentUser });
      return;
    }
    if (path === '/api/bitacora/dashboard' && method === 'GET') {
      await json(route, {
        hoy: 0,
        proximas: state.activities.filter((item) => item.estado_programacion === 'PROGRAMADA').length,
        pendientes: state.activities.filter(matchesCompleteness).length,
        devueltas: state.activities.filter((item) => item.estado_documentacion === 'REQUIERE_CORRECCION').length,
        pendientes_control: state.activities.filter((item) => item.estado_documentacion === 'ENVIADA').length,
        acuerdos_vencidos: 0,
        sin_fecha: state.activities.filter((item) => !item.inicio_at && !item.inicio_utc).length,
      });
      return;
    }
    if (path === '/api/bitacora/notificaciones' && method === 'GET') {
      const onlyUnread = url.searchParams.get('leida') === 'false';
      const items = onlyUnread
        ? state.notifications.filter((item) => !item.leida && !item.leida_at)
        : state.notifications;
      const pageNumber = Number(url.searchParams.get('page')) || 1;
      const limit = Number(url.searchParams.get('limit')) || 20;
      await json(route, { items: items.slice((pageNumber - 1) * limit, pageNumber * limit), total: items.length, page: pageNumber, limit });
      return;
    }
    const readMatch = path.match(/^\/api\/bitacora\/notificaciones\/(\d+)\/leer$/);
    if (readMatch && method === 'POST') {
      const id = Number(readMatch[1]);
      state.notifications = state.notifications.map((item) => item.id === id ? { ...item, leida: true, leida_at: new Date().toISOString() } : item);
      await json(route, { ok: true });
      return;
    }
    if (path === '/api/bitacora/personas' && method === 'GET') {
      await json(route, {
        items: [
          { id: 11, username: 'browser.assistant', nombre: 'Asistente de Navegador', unidad: 'SFyC' },
          { id: 13, username: 'browser.director', nombre: 'Director de Navegador', unidad: 'Dirección' },
        ],
        total: 2,
        page: 1,
        limit: 50,
      });
      return;
    }
    if (path === '/api/bitacora/catalogos/tipo_actividad/valores' && method === 'GET') {
      await json(route, { items: [{ id: 2, clave: 'TALLER', nombre: 'Taller' }], total: 1, page: 1, limit: 500 });
      return;
    }
    if (path === '/api/bitacora/catalogos/clasificacion/valores' && method === 'GET') {
      await json(route, { items: [], total: 0, page: 1, limit: 500 });
      return;
    }
    if (path === '/api/bitacora/configuracion' && method === 'GET') {
      await json(route, { etiquetas: [], campos_personalizados: [] });
      return;
    }
    if (path === '/api/bitacora/actividades' && method === 'GET') {
      await json(route, listActivities(state, url));
      return;
    }
    if (path === '/api/bitacora/actividades' && method === 'POST') {
      const created = completeActivity({
        ...body,
        id: state.nextActivityId++,
        tipo: body.tipo || 'Taller',
        inicio_utc: body.inicio_at,
        fin_utc: body.fin_at,
        estado_programacion: 'BORRADOR',
        estado_documentacion: 'NO_INICIADA',
        version: 1,
        participantes: body.participantes || [],
        acuerdos: body.acuerdos || [],
        informe: body.informe || {},
        evidencias: [],
        created_at: CREATED_AT,
      });
      state.activities.push(created);
      await json(route, created, 201);
      return;
    }

    const participantMatch = path.match(/^\/api\/bitacora\/actividades\/(\d+)\/participantes$/);
    if (participantMatch && method === 'PUT') {
      const activity = state.activities.find((item) => item.id === Number(participantMatch[1]));
      Object.assign(activity, { participantes: body.participantes, version: activity.version + 1 });
      await json(route, activity);
      return;
    }
    const reportMatch = path.match(/^\/api\/bitacora\/actividades\/(\d+)\/informe$/);
    if (reportMatch && method === 'PUT') {
      const activity = state.activities.find((item) => item.id === Number(reportMatch[1]));
      Object.assign(activity, { informe: body, estado_documentacion: 'BORRADOR', version: activity.version + 1 });
      await json(route, activity);
      return;
    }
    const agreementListMatch = path.match(/^\/api\/bitacora\/actividades\/(\d+)\/acuerdos$/);
    if (agreementListMatch && method === 'GET') {
      const activity = state.activities.find((item) => item.id === Number(agreementListMatch[1]));
      await json(route, { items: activity?.acuerdos || [], total: activity?.acuerdos?.length || 0, page: 1, limit: 200 });
      return;
    }
    const evidenceListMatch = path.match(/^\/api\/bitacora\/actividades\/(\d+)\/evidencias$/);
    if (evidenceListMatch && method === 'GET') {
      const activity = state.activities.find((item) => item.id === Number(evidenceListMatch[1]));
      await json(route, { items: activity?.evidencias || [], total: activity?.evidencias?.length || 0, page: 1, limit: 200 });
      return;
    }
    const actionMatch = path.match(/^\/api\/bitacora\/actividades\/(\d+)\/(programar|marcar-realizada|marcar-no-realizada|cancelar|enviar|devolver|completar|reabrir)$/);
    if (actionMatch && method === 'POST') {
      if (state.conflicts.delete(path)) {
        await json(route, { detail: { code: 'VERSION_CONFLICT', detail: 'La actividad cambió.' } }, 409);
        return;
      }
      const activity = state.activities.find((item) => item.id === Number(actionMatch[1]));
      Object.assign(activity, actionState(activity, actionMatch[2]), { version: activity.version + 1 });
      await json(route, activity);
      return;
    }
    const activityMatch = path.match(/^\/api\/bitacora\/actividades\/(\d+)$/);
    if (activityMatch && method === 'GET') {
      const activity = state.activities.find((item) => item.id === Number(activityMatch[1]));
      await json(route, activity || { detail: 'No encontrado' }, activity ? 200 : 404);
      return;
    }
    if (activityMatch && method === 'PUT') {
      if (state.conflicts.delete(path)) {
        await json(route, { detail: { code: 'VERSION_CONFLICT', detail: 'La actividad cambió.' } }, 409);
        return;
      }
      const activity = state.activities.find((item) => item.id === Number(activityMatch[1]));
      Object.assign(activity, body, {
        inicio_utc: body.inicio_at,
        fin_utc: body.fin_at,
        version: activity.version + 1,
      });
      const replacementId = Number(options.seriesUpdateResultId || 0);
      if (
        replacementId > 0
        && url.searchParams.get('scope') !== 'single'
        && replacementId !== activity.id
      ) {
        let replacement = state.activities.find((item) => item.id === replacementId);
        if (!replacement) {
          replacement = { ...structuredClone(activity), id: replacementId };
          state.activities.push(replacement);
        }
        await json(route, replacement);
        return;
      }
      await json(route, activity);
      return;
    }

    await json(route, { detail: { code: 'MOCK_ROUTE_MISSING', detail: `${method} ${path}` } }, 501);
  });
  return state;
}

export function unexpectedFailures(page, allowedStatuses = []) {
  const issues = [];
  page.on('console', (message) => {
    if (message.type() !== 'error') return;
    const status = Number(message.text().match(/status of (\d+)/)?.[1] || 0);
    if (status && allowedStatuses.includes(status)) return;
    issues.push(`console: ${message.text()}`);
  });
  page.on('pageerror', (error) => issues.push(`pageerror: ${error.message}`));
  page.on('requestfailed', (request) => {
    // Una navegación intencional cancela las cargas de la pantalla anterior.
    if (request.failure()?.errorText === 'net::ERR_ABORTED') return;
    issues.push(`requestfailed: ${request.method()} ${request.url()}`);
  });
  page.on('response', (response) => {
    if (response.status() >= 400 && !allowedStatuses.includes(response.status())) {
      issues.push(`http: ${response.status()} ${response.request().method()} ${response.url()}`);
    }
  });
  return issues;
}

export async function login(page, username = 'browser.assistant') {
  await page.goto('bitacora/login');
  await page.getByLabel('Usuario').fill(username);
  await page.getByLabel('Contraseña').fill('isolated-e2e-password');
  await page.getByRole('button', { name: 'Iniciar sesión' }).click();
}
