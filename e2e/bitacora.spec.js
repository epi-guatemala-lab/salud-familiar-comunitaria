import { expect, test } from '@playwright/test';
import {
  completeActivity,
  installScenarioApi,
  login,
  unexpectedFailures,
  userFor,
} from './bitacora-scenario';

const API_ORIGIN = 'http://api.invalid';
const CREATED_AT = '2026-07-21T20:58:27.790Z';

function tokenFor(user) {
  const encode = (value) => Buffer.from(JSON.stringify(value)).toString('base64url');
  return `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode({
    sub: String(user.id),
    exp: Math.floor(Date.now() / 1000) + 3600,
  })}.isolated-e2e-signature`;
}

function assistantUser() {
  return {
    id: 11,
    username: 'browser.assistant',
    nombre_completo: 'Asistente de Navegador',
    rol: 'personal',
    roles: ['bitacora.asistente'],
    permissions: [
      'bitacora.read',
      'bitacora.create',
      'bitacora.edit',
      'bitacora.schedule',
      'bitacora.participants.manage',
      'bitacora.agreements.manage',
      'bitacora.evidence.manage',
      'bitacora.submit',
    ],
    password_reset_required: false,
  };
}

function secretaryUser() {
  return {
    id: 12,
    username: 'browser.secretary',
    nombre_completo: 'Secretaría de Navegador',
    rol: 'personal',
    roles: ['bitacora.secretaria'],
    permissions: [
      'bitacora.read',
      'bitacora.create',
      'bitacora.schedule',
      'bitacora.schedule.control',
      'bitacora.participants.manage',
      'bitacora.review',
      'bitacora.complete',
      'bitacora.reopen',
    ],
    password_reset_required: false,
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

async function installApi(page) {
  let persistedActivity = null;
  await page.route(`${API_ORIGIN}/**`, async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname;
    if (request.method() === 'OPTIONS') {
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
    if (path === '/api/auth/login' && request.method() === 'POST') {
      const credentials = request.postDataJSON();
      const user = credentials.username.includes('secretary')
        ? secretaryUser()
        : assistantUser();
      await json(route, {
        token: tokenFor(user),
        user,
        password_reset_required: false,
      });
      return;
    }
    if (path === '/api/bitacora/dashboard') {
      await json(route, {
        hoy: 0,
        proximas: 0,
        pendientes: persistedActivity ? 1 : 0,
        devueltas: 0,
        pendientes_control: 0,
        acuerdos_vencidos: 0,
        sin_fecha: 0,
      });
      return;
    }
    if (path === '/api/bitacora/notificaciones') {
      await json(route, { items: [], total: 0, page: 1, limit: 1 });
      return;
    }
    if (path === '/api/bitacora/personas') {
      await json(route, {
        items: [{ id: 11, username: 'browser.assistant', nombre: 'Asistente de Navegador' }],
        total: 1,
        page: 1,
        limit: 50,
      });
      return;
    }
    if (path === '/api/bitacora/catalogos/tipo_actividad/valores') {
      await json(route, {
        items: [{ id: 2, clave: 'TALLER', nombre: 'Taller' }],
        total: 1,
        page: 1,
        limit: 500,
      });
      return;
    }
    if (path === '/api/bitacora/catalogos/clasificacion/valores') {
      await json(route, { items: [], total: 0, page: 1, limit: 500 });
      return;
    }
    if (path === '/api/bitacora/configuracion') {
      await json(route, { etiquetas: [], campos_personalizados: [] });
      return;
    }
    if (path === '/api/bitacora/actividades' && request.method() === 'POST') {
      const payload = request.postDataJSON();
      persistedActivity = {
        ...payload,
        id: 77,
        titulo: payload.titulo,
        tipo: 'Taller',
        tipo_valor_id: payload.tipo_valor_id || 2,
        inicio_utc: payload.inicio_at,
        fin_utc: payload.fin_at,
        estado_programacion: 'BORRADOR',
        estado_documentacion: 'NO_INICIADA',
        version: 1,
        created_at: CREATED_AT,
        participantes: [],
        acuerdos: [],
        evidencias: [],
        informe: {},
        recurrencia: { enabled: false },
        permissions: ['programar'],
      };
      await json(route, persistedActivity, 201);
      return;
    }
    if (path === '/api/bitacora/actividades/77' && persistedActivity) {
      await json(route, persistedActivity);
      return;
    }
    if (path === '/api/bitacora/actividades') {
      await json(route, { items: [], total: 0, page: 1, limit: 100 });
      return;
    }
    await json(route, { detail: { code: 'MOCK_ROUTE_MISSING', detail: path } }, 501);
  });
}

function watchFailures(page) {
  const issues = [];
  page.on('console', (message) => {
    if (message.type() === 'error') issues.push(`console: ${message.text()}`);
  });
  page.on('pageerror', (error) => issues.push(`pageerror: ${error.message}`));
  page.on('requestfailed', (request) => {
    issues.push(`requestfailed: ${request.method()} ${request.url()}`);
  });
  page.on('response', (response) => {
    if (response.status() >= 400) {
      issues.push(`http: ${response.status()} ${response.request().method()} ${response.url()}`);
    }
  });
  return issues;
}

async function loginWithKeyboard(page, username) {
  await page.goto('bitacora/login');
  await page.getByLabel('Usuario').focus();
  await page.keyboard.type(username);
  await page.keyboard.press('Tab');
  await expect(page.getByLabel('Contraseña')).toBeFocused();
  await page.keyboard.type('isolated-e2e-password');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: 'Iniciar sesión' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { name: 'Bitácora de actividades' })).toBeVisible();
}

test('asistente crea un borrador persistente y la vista móvil conserva el RBAC', async ({ page }) => {
  await installApi(page);
  const issues = watchFailures(page);
  await loginWithKeyboard(page, 'browser.assistant');
  await expect(page.getByText('Pendientes de control', { exact: true })).toHaveCount(0);

  await page.getByRole('link', { name: /Nueva actividad/ }).first().click();
  await expect(page.getByRole('heading', { name: 'Nueva actividad' })).toBeVisible();
  await expect(page.getByText(/No ingrese nombres, números de afiliación/)).toBeVisible();
  await page.getByLabel('Título').fill('Validación E2E de Bitácora');
  await page.getByLabel('Objetivo').fill('Confirmar el flujo de navegador automatizado.');
  await page.getByLabel('Tipo de actividad').selectOption({ label: 'Taller' });
  await page.getByLabel('Modalidad').selectOption({ label: 'Presencial' });
  await page.getByLabel('Unidad o lugar').fill('Unidad de prueba aislada');
  await page.getByLabel('Organizador').fill('Equipo E2E');
  await page.locator('input[name="start-at"]').fill('2026-07-23T09:00');
  await page.locator('input[name="end-at"]').fill('2026-07-23T10:00');
  await page.getByRole('button', { name: 'Guardar borrador' }).click();

  await expect(page).toHaveURL(/\/bitacora\/actividades\/77$/);
  await expect(page.getByText(/Último guardado:/)).toBeVisible();
  await expect(page.getByText('Borrador', { exact: true }).first()).toBeVisible();

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('bitacora');
  await expect(page.getByRole('heading', { name: 'Bitácora de actividades' })).toBeVisible();
  const createTarget = await page.getByRole('link', { name: /Nueva actividad/ }).first().boundingBox();
  expect(createTarget?.height).toBeGreaterThanOrEqual(44);
  const horizontalOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth
  );
  expect(horizontalOverflow).toBe(false);
  expect(issues).toEqual([]);
});

test('Secretaría ve la cola global sin recibir permiso narrativo', async ({ page }) => {
  await installApi(page);
  const issues = watchFailures(page);
  await loginWithKeyboard(page, 'browser.secretary');
  await expect(page.getByText('Pendientes de control', { exact: true })).toBeVisible();
  await page.goto('bitacora/control');
  await expect(page.getByRole('heading', { name: 'Control documental' })).toBeVisible();
  await expect(page.getByText(/El relato enviado permanece bajo la autoría/)).toBeVisible();
  const storedUser = await page.evaluate(() => JSON.parse(localStorage.getItem('sfyc_user')));
  expect(storedUser.permissions).not.toContain('bitacora.report.edit');
  expect(issues).toEqual([]);
});

for (const [role, username, expectedLabel, seesControl] of [
  ['assistant', 'browser.assistant', 'Asistente', false],
  ['director', 'browser.director', 'Director', false],
  ['secretary', 'browser.secretary', 'Secretaría de control documental', true],
  ['admin', 'browser.admin', 'Administrador SFyC', false],
]) {
  test(`RBAC navegable para ${role}`, async ({ page }) => {
    await installScenarioApi(page, { user: userFor(role) });
    const issues = unexpectedFailures(page);
    await login(page, username);
    await expect(page.getByRole('heading', { name: 'Bitácora de actividades' })).toBeVisible();
    await expect(page.getByText(expectedLabel, { exact: true })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Control documental' })).toHaveCount(seesControl ? 1 : 0);
    await expect(page.getByRole('link', { name: /Nueva actividad/ }).first()).toBeVisible();
    expect(issues).toEqual([]);
  });
}

test('rechaza una cuenta sin rol de Bitácora y elimina su sesión local', async ({ page }) => {
  await installScenarioApi(page, { user: userFor('outsider') });
  const issues = unexpectedFailures(page);
  await login(page, 'browser.outsider');
  await expect(page.getByText('Esta cuenta no tiene acceso a este portal')).toBeVisible();
  await expect(page).toHaveURL(/\/bitacora\/login$/);
  const auth = await page.evaluate(() => ({
    token: localStorage.getItem('sfyc_token'),
    user: localStorage.getItem('sfyc_user'),
  }));
  expect(auth).toEqual({ token: null, user: null });
  expect(issues).toEqual([]);
});

test('fuerza el cambio de contraseña temporal antes de permitir el portal', async ({ page }) => {
  const state = await installScenarioApi(page, {
    user: userFor('assistant', { password_reset_required: true }),
  });
  const issues = unexpectedFailures(page);
  await login(page);
  await expect(page.getByRole('heading', { name: 'Cambie su contraseña temporal' })).toBeVisible();

  await page.goto('bitacora');
  await expect(page.getByRole('heading', { name: 'Cambie su contraseña temporal' })).toBeVisible();
  await page.getByLabel('Contraseña temporal').fill('temporary-only-for-e2e');
  await page.locator('input[name="new-password"]').fill('debil');
  await page.locator('input[name="confirm-password"]').fill('debil');
  await page.getByRole('button', { name: 'Guardar y continuar' }).click();
  await expect(page.getByRole('alert')).toContainText('al menos 8 caracteres');

  await page.locator('input[name="new-password"]').fill('NuevaAislada2026');
  await page.locator('input[name="confirm-password"]').fill('NuevaAislada2026');
  await page.getByRole('button', { name: 'Guardar y continuar' }).click();
  await expect(page.getByRole('heading', { name: 'Bitácora de actividades' })).toBeVisible();
  expect(state.requests.some((request) => request.path === '/api/auth/change-password')).toBe(true);
  expect(issues).toEqual([]);
});

test('asistente recorre programación, realización y envío sin poder editar el relato enviado', async ({ page }) => {
  const state = await installScenarioApi(page, { activities: [completeActivity()] });
  const issues = unexpectedFailures(page);
  await login(page);
  await page.goto('bitacora/actividades/101');
  await page.getByRole('button', { name: /Revisión/ }).click();

  for (const [action, resultingStatus] of [
    ['Programar', 'Programada'],
    ['Marcar realizada', 'Realizada'],
    ['Enviar a control', 'En revisión documental'],
  ]) {
    await page.getByRole('button', { name: action, exact: true }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.getByRole('dialog').getByRole('button', { name: 'Confirmar' }).click();
    await expect(page.getByText(resultingStatus, { exact: true }).first()).toBeVisible();
  }

  await page.getByRole('button', { name: /Informe/ }).click();
  await expect(page.getByText(/modo de consulta/)).toBeVisible();
  await expect(page.getByLabel('Qué ocurrió')).toBeDisabled();
  const actionRequests = state.requests.filter((request) => /\/(programar|marcar-realizada|enviar)$/.test(request.path));
  expect(actionRequests).toHaveLength(3);
  for (const request of actionRequests) {
    expect(request.headers['if-match']).toBeTruthy();
    expect(request.headers['idempotency-key']).toBeTruthy();
  }
  expect(state.activities[0].estado_documentacion).toBe('ENVIADA');
  expect(issues).toEqual([]);
});

test('Secretaría devuelve y completa expedientes, refrescando ambas bandejas y sus totales', async ({ page }) => {
  const activities = [
    completeActivity({ id: 201, titulo: 'Expediente para devolver', estado_programacion: 'REALIZADA', estado_documentacion: 'ENVIADA', missing_fields: ['Aprendizaje'] }),
    completeActivity({ id: 202, titulo: 'Expediente para completar', estado_programacion: 'REALIZADA', estado_documentacion: 'ENVIADA' }),
  ];
  const state = await installScenarioApi(page, { user: userFor('secretary'), activities });
  const issues = unexpectedFailures(page);
  await login(page, 'browser.secretary');
  await page.goto('bitacora/control');
  await expect(page.getByRole('heading', { name: 'Pendientes de control (2)' })).toBeVisible();

  await page.getByRole('button', { name: 'Solicitar corrección' }).first().click();
  const returnDialog = page.getByRole('dialog');
  await returnDialog.getByLabel('Observaciones para corregir').fill('x');
  await expect(returnDialog.getByRole('button', { name: 'Confirmar' })).toBeDisabled();
  await returnDialog.getByLabel('Observaciones para corregir').fill('Corregir el aprendizaje documentado.');
  await returnDialog.getByRole('button', { name: 'Confirmar' }).click();
  await expect(page.getByRole('heading', { name: 'Pendientes de control (1)' })).toBeVisible();
  await expect(page.getByText('Expediente para devolver')).toBeVisible();

  await page.getByRole('button', { name: 'Marcar completa' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Confirmar' }).click();
  await expect(page.getByRole('heading', { name: 'Pendientes de control (0)' })).toBeVisible();
  await expect(page.getByText('No hay documentación esperando revisión')).toBeVisible();
  expect(state.activities.find((item) => item.id === 201).estado_documentacion).toBe('REQUIERE_CORRECCION');
  expect(state.activities.find((item) => item.id === 202).estado_documentacion).toBe('COMPLETA');
  expect(issues).toEqual([]);
});

test('Secretaría pagina ambas colas sin ocultar actividades después de veinte', async ({ page }) => {
  const sent = Array.from({ length: 21 }, (_, index) => completeActivity({
    id: 300 + index,
    titulo: `Pendiente control ${index + 1}`,
    estado_programacion: 'REALIZADA',
    estado_documentacion: 'ENVIADA',
  }));
  const missing = Array.from({ length: 21 }, (_, index) => completeActivity({
    id: 400 + index,
    titulo: `Faltante documental ${index + 1}`,
    estado_programacion: 'REALIZADA',
    estado_documentacion: 'BORRADOR',
    missing_fields: ['Aprendizaje'],
  }));
  await installScenarioApi(page, {
    user: userFor('secretary'),
    activities: [...sent, ...missing],
  });
  const issues = unexpectedFailures(page);
  await login(page, 'browser.secretary');
  await page.goto('bitacora/control');

  const reviewQueue = page.locator('section[aria-labelledby="review-title"]');
  const missingQueue = page.locator('section[aria-labelledby="missing-title"]');
  await expect(reviewQueue.getByText('Pendiente control 1', { exact: true })).toBeVisible();
  await reviewQueue.getByRole('button', { name: 'Siguiente' }).click();
  await expect(reviewQueue.getByText('Pendiente control 21', { exact: true })).toBeVisible();
  await expect(reviewQueue.getByText(/Página 2 de 2/)).toBeVisible();

  await expect(missingQueue.getByText('Faltante documental 1', { exact: true })).toBeVisible();
  await missingQueue.getByRole('button', { name: 'Siguiente' }).click();
  await expect(missingQueue.getByText('Faltante documental 21', { exact: true })).toBeVisible();
  await expect(missingQueue.getByText(/Página 2 de 2/)).toBeVisible();
  expect(issues).toEqual([]);
});

test('un 409 de workflow nunca aparenta éxito y ofrece recargar la versión reciente', async ({ page }) => {
  const path = '/api/bitacora/actividades/101/programar';
  const state = await installScenarioApi(page, {
    activities: [completeActivity()],
    conflicts: [path],
  });
  const issues = unexpectedFailures(page, [409]);
  await login(page);
  await page.goto('bitacora/actividades/101');
  await page.getByRole('button', { name: /Revisión/ }).click();
  await page.getByRole('button', { name: 'Programar', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Confirmar' }).click();
  await expect(page.getByRole('alert').filter({ hasText: 'no se aplicó su acción' })).toBeVisible();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  const loadsBeforeRefresh = state.requests.filter(
    (request) => request.method === 'GET' && request.path === '/api/bitacora/actividades/101'
  ).length;
  await page.getByRole('button', { name: 'Cargar versión reciente' }).click();
  await expect.poll(() => state.requests.filter(
    (request) => request.method === 'GET' && request.path === '/api/bitacora/actividades/101'
  ).length).toBeGreaterThan(loadsBeforeRefresh);
  await expect(page.getByRole('alert').filter({ hasText: 'no se aplicó su acción' })).toHaveCount(0);
  expect(state.activities[0].estado_programacion).toBe('BORRADOR');
  expect(issues).toEqual([]);
});

test('un acuerdo parcial no aparenta guardarse ni permite avanzar', async ({ page }) => {
  const state = await installScenarioApi(page, {
    activities: [completeActivity({ acuerdos: [] })],
  });
  const issues = unexpectedFailures(page);
  await login(page);
  await page.goto('bitacora/actividades/101');
  await page.getByRole('button', { name: /Acuerdos/ }).click();
  await page.getByLabel('Descripción').fill('Texto parcial que todavía no tiene responsable ni fecha.');
  await page.getByRole('button', { name: 'Guardar y continuar' }).click();

  await expect(page.getByRole('heading', { name: '4. Acuerdos' })).toBeVisible();
  await expect(page.getByRole('alert')).toContainText('No se guardó el borrador');
  await expect(page.getByText('Borrador guardado en el servidor.')).toHaveCount(0);
  expect(state.requests.some((request) => /\/acuerdos$/.test(request.path) && request.method !== 'GET')).toBe(false);
  expect(issues).toEqual([]);
});

test('crea recurrencia anual con conteo, UTC Guatemala e idempotencia sin guardar el acta localmente', async ({ page }) => {
  const state = await installScenarioApi(page);
  const issues = unexpectedFailures(page);
  await login(page);
  await page.goto('bitacora/actividades/nueva');
  await page.getByLabel('Título').fill('Serie anual automatizada');
  await page.getByLabel('Objetivo').fill('Probar recurrencia anual.');
  await page.getByLabel('Tipo de actividad').selectOption({ label: 'Taller' });
  await page.getByLabel('Modalidad').selectOption({ label: 'Presencial' });
  await page.getByLabel('Unidad o lugar').fill('Unidad aislada');
  await page.getByLabel('Organizador').fill('Equipo E2E');
  await page.locator('input[name="start-at"]').fill('2026-08-05T09:15');
  await page.locator('input[name="end-at"]').fill('2026-08-05T10:45');
  await page.getByLabel('Actividad recurrente').check();
  await page.getByLabel('Frecuencia').selectOption('YEARLY');
  await page.getByLabel('Finaliza por').selectOption('conteo');
  await page.getByLabel('Ocurrencias').fill('3');
  await page.getByRole('button', { name: 'Guardar borrador' }).click();

  const create = state.requests.find((request) => request.method === 'POST' && request.path === '/api/bitacora/actividades');
  expect(create.body.inicio_at).toBe('2026-08-05T15:15:00.000Z');
  expect(create.body.fin_at).toBe('2026-08-05T16:45:00.000Z');
  expect(create.body.recurrencia).toMatchObject({ frecuencia: 'YEARLY', conteo: 3, intervalo: 1 });
  expect(create.headers['idempotency-key']).toBeTruthy();
  const localKeys = await page.evaluate(() => Object.keys(localStorage));
  expect(localKeys.sort()).toEqual(['sfyc_token', 'sfyc_user']);
  expect(issues).toEqual([]);
});

test('edición de una serie exige alcance future o series y conserva If-Match', async ({ page }) => {
  const state = await installScenarioApi(page, {
    activities: [completeActivity({
      id: 111,
      serie_id: 'series-isolated-111',
      recurrencia: {
        enabled: true,
        serie_id: 'series-isolated-111',
        rrule: 'FREQ=WEEKLY;INTERVAL=2;BYDAY=MO,WE;COUNT=3',
        timezone: 'America/Guatemala',
      },
    })],
  });
  const issues = unexpectedFailures(page);
  await login(page);
  await page.goto('bitacora/actividades/111');
  await expect(page.getByLabel('Frecuencia')).toHaveValue('WEEKLY');
  await expect(page.getByLabel('Cada cuántos períodos')).toHaveValue('2');
  await expect(page.getByLabel('Finaliza por')).toHaveValue('conteo');
  await expect(page.getByLabel('Ocurrencias')).toHaveValue('3');
  await page.getByLabel('Frecuencia').selectOption('MONTHLY');
  await page.getByRole('button', { name: 'Guardar borrador' }).click();
  await expect(page.getByText(/requiere elegir “Esta y las futuras”/)).toBeVisible();
  expect(state.requests.filter((request) => request.method === 'PUT' && request.path.endsWith('/111'))).toHaveLength(0);

  await page.getByLabel('Esta y las futuras').check();
  await page.getByRole('button', { name: 'Guardar borrador' }).click();
  const future = state.requests.find((request) => request.method === 'PUT' && request.path.endsWith('/111'));
  expect(future.query.scope).toBe('future');
  expect(future.headers['if-match']).toBe('1');
  expect(future.body.recurrencia.rrule).toContain('FREQ=MONTHLY');
  expect(future.body.recurrencia.rrule).toContain('BYDAY=MO,WE');
  expect(future.body.recurrencia.rrule).toContain('COUNT=3');

  await page.getByLabel('Frecuencia').selectOption('YEARLY');
  await page.getByLabel('Toda la serie').check();
  await page.getByRole('button', { name: 'Guardar borrador' }).click();
  const updates = state.requests.filter((request) => request.method === 'PUT' && request.path.endsWith('/111'));
  expect(updates.at(-1).query.scope).toBe('series');
  expect(issues).toEqual([]);
});

test('una edición future navega a la actividad devuelta por el backend', async ({ page }) => {
  const state = await installScenarioApi(page, {
    seriesUpdateResultId: 112,
    activities: [completeActivity({
      id: 111,
      serie_id: 'series-isolated-111',
      recurrencia: {
        enabled: true,
        serie_id: 'series-isolated-111',
        rrule: 'FREQ=YEARLY;INTERVAL=1;BYMONTH=7;BYMONTHDAY=21;COUNT=4',
        timezone: 'America/Guatemala',
      },
    })],
  });
  const issues = unexpectedFailures(page);
  await login(page);
  await page.goto('bitacora/actividades/111');
  await expect(page.getByLabel('Frecuencia')).toHaveValue('YEARLY');
  await page.getByLabel('Cada cuántos períodos').fill('2');
  await page.getByLabel('Esta y las futuras').check();
  await page.getByRole('button', { name: 'Guardar borrador' }).click();

  await expect(page).toHaveURL(/\/bitacora\/actividades\/112$/);
  await expect.poll(() => state.requests.some(
    (request) => request.method === 'GET' && request.path === '/api/bitacora/actividades/112'
  )).toBe(true);
  const update = state.requests.find(
    (request) => request.method === 'PUT' && request.path === '/api/bitacora/actividades/111'
  );
  expect(update.query.scope).toBe('future');
  expect(update.body.recurrencia.rrule).toContain('INTERVAL=2');
  expect(update.body.recurrencia.rrule).toContain('BYMONTH=7');
  expect(issues).toEqual([]);
});

test('marcar una notificación leída actualiza inmediatamente lista y contador lateral', async ({ page }) => {
  const state = await installScenarioApi(page, {
    notifications: [{
      id: 301,
      titulo: 'Actividad pendiente',
      mensaje: 'Resumen institucional aislado.',
      actividad_id: 101,
      created_at: '2026-07-21T18:00:00.000Z',
      leida: false,
    }],
  });
  const issues = unexpectedFailures(page);
  await login(page);
  await expect(page.getByRole('link', { name: 'Notificaciones (1)' })).toBeVisible();
  await page.getByRole('link', { name: 'Notificaciones (1)' }).click();
  await page.getByRole('button', { name: 'Marcar leída' }).click();
  await expect(page.getByRole('link', { name: 'Notificaciones', exact: true })).toBeVisible();
  await expect(page.getByText('Nueva', { exact: true })).toHaveCount(0);
  const readRequest = state.requests.find((request) => request.path.endsWith('/notificaciones/301/leer'));
  expect(readRequest.headers['idempotency-key']).toBeTruthy();
  expect(issues).toEqual([]);
});

test('dashboard muestra error recuperable tras agotar reintentos GET', async ({ page }) => {
  // React StrictMode monta los efectos dos veces en desarrollo: ambas cargas deben fallar
  // para demostrar el estado de error después de agotar los tres intentos de cada una.
  await installScenarioApi(page, { failures: { 'GET /api/bitacora/dashboard': 6 } });
  const issues = unexpectedFailures(page, [503]);
  await login(page);
  await expect(page.getByRole('heading', { name: 'No fue posible cargar la información' })).toBeVisible();
  await page.getByRole('button', { name: 'Reintentar' }).click();
  await expect(page.getByRole('heading', { name: 'Bitácora de actividades' })).toBeVisible();
  await expect(page.getByText('No hay próximas actividades en el período.')).toBeVisible();
  expect(issues).toEqual([]);
});

test('menú móvil responde a teclado, restaura foco y evita desbordamiento horizontal', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await installScenarioApi(page);
  const issues = unexpectedFailures(page);
  await login(page);
  const menu = page.getByRole('button', { name: 'Abrir menú' });
  await menu.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('navigation', { name: 'Navegación de Bitácora' }).getByRole('link', { name: 'Inicio' })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(menu).toBeFocused();
  await expect(menu).toHaveAttribute('aria-expanded', 'false');
  const layout = await page.evaluate(() => ({
    overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
    bodyOverflow: document.body.style.overflow,
  }));
  expect(layout).toEqual({ overflow: false, bodyOverflow: '' });
  await page.screenshot({ path: 'artifacts/playwright/bitacora-movil-asistente.png', fullPage: true });
  expect(issues).toEqual([]);
});

test('un 401 invalida inmediatamente token y usuario y vuelve al login correcto', async ({ page }) => {
  await installScenarioApi(page);
  await page.route(`${API_ORIGIN}/api/bitacora/dashboard`, (route) => json(
    route,
    { detail: { code: 'UNAUTHORIZED', detail: 'Sesión expirada.' } },
    401
  ));
  const issues = unexpectedFailures(page, [401]);
  await login(page);
  await expect(page.getByRole('heading', { name: 'Iniciar sesión' })).toBeVisible();
  await expect(page).toHaveURL(/\/bitacora\/login$/);
  const stored = await page.evaluate(() => [
    localStorage.getItem('sfyc_token'),
    localStorage.getItem('sfyc_user'),
  ]);
  expect(stored).toEqual([null, null]);
  expect(issues).toEqual([]);
});

test('rechaza evidencia con formato no permitido antes de enviarla', async ({ page }) => {
  const state = await installScenarioApi(page);
  const issues = unexpectedFailures(page);
  await login(page);
  await page.goto('bitacora/actividades/nueva');
  await page.getByRole('button', { name: /Evidencias/ }).click();
  await page.getByLabel('Agregar archivos').setInputFiles({
    name: 'archivo-no-permitido.exe',
    mimeType: 'application/x-msdownload',
    buffer: Buffer.from('TEST_ONLY_not_an_executable'),
  });
  await expect(page.getByText(/formato no permitido/)).toBeVisible();
  expect(state.requests.some((request) => request.path.endsWith('/evidencias'))).toBe(false);
  expect(issues).toEqual([]);
});

test('calendario ofrece mes, semana, día, agenda y bandeja Sin fecha', async ({ page }) => {
  await installScenarioApi(page, {
    activities: [completeActivity({
      id: 401,
      titulo: 'Registro histórico sin fecha',
      inicio_utc: null,
      fin_utc: null,
      legacy_import: true,
      precision_fecha: 'SIN_FECHA',
      fecha_texto_original: '',
    })],
  });
  const issues = unexpectedFailures(page);
  await login(page);
  await page.goto('bitacora/calendario');
  await expect(page.getByRole('heading', { name: 'Calendario global' })).toBeVisible();
  for (const view of ['Mes', 'Semana', 'Día', 'Agenda']) {
    await expect(page.getByRole('button', { name: view, exact: true })).toBeVisible();
  }
  await expect(page.getByRole('heading', { name: 'Sin fecha' })).toBeVisible();
  await expect(page.getByText('Registro histórico sin fecha')).toBeVisible();
  await page.getByRole('button', { name: 'Agenda', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Agenda', exact: true })).toHaveAttribute('aria-pressed', 'true');
  expect(issues).toEqual([]);
});
