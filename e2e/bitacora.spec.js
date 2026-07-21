import { expect, test } from '@playwright/test';

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
