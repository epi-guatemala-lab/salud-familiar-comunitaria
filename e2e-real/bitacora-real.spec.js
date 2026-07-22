import { expect, test } from '@playwright/test';
import fs from 'node:fs';

const liveCredentials = process.env.SFYC_LIVE_SMOKE_CREDENTIALS
  ? JSON.parse(fs.readFileSync(process.env.SFYC_LIVE_SMOKE_CREDENTIALS, 'utf8'))
  : null;
const TEMPORARY_PASSWORD = liveCredentials?.temporary_password
  || 'TEST_ONLY_BrowserE2E9'; // pragma: allowlist secret
const NEW_PASSWORDS = liveCredentials?.new_passwords || {
  'browser.assistant': 'TEST_ONLY_AssistantNew9',
  'browser.director': 'TEST_ONLY_DirectorNew9',
  'browser.secretary': 'TEST_ONLY_SecretaryNew9',
  'browser.admin': 'TEST_ONLY_AdminNew9',
};

function gtDateTime(daysAhead, hour, minute = 0) {
  const target = new Date(Date.now() + daysAhead * 24 * 60 * 60 * 1000);
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Guatemala',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(target);
  const value = (type) => parts.find((part) => part.type === type)?.value;
  return `${value('year')}-${value('month')}-${value('day')}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

function watchBrowser(page) {
  const issues = [];
  page.on('pageerror', (error) => issues.push(`pageerror: ${error.message}`));
  page.on('console', (message) => {
    if (message.type() === 'error') issues.push(`console: ${message.text()}`);
  });
  page.on('requestfailed', (request) => {
    if (request.failure()?.errorText !== 'net::ERR_ABORTED') {
      issues.push(`requestfailed: ${request.method()} ${request.url()}`);
    }
  });
  page.on('response', (response) => {
    if (response.status() >= 400) {
      issues.push(`http: ${response.status()} ${response.request().method()} ${response.url()}`);
    }
  });
  return issues;
}

async function login(page, username, password) {
  await page.goto('bitacora/login');
  await page.getByLabel('Usuario').fill(username);
  await page.getByLabel('Contraseña').fill(password);
  await page.getByRole('button', { name: 'Iniciar sesión' }).click();
}

async function logout(page) {
  await page.getByRole('button', { name: 'Cerrar sesión' }).click();
  await expect(page).toHaveURL(/\/salud-familiar-comunitaria\/$/);
}

test.describe.serial('Bitácora contra FastAPI y SQLite efímeros', () => {
  test('roles Bitácora conservan su clave inicial y el admin legado mantiene su política', async ({ page }) => {
    test.setTimeout(90_000);
    const issues = watchBrowser(page);
    const operationalRoles = [
      ['browser.assistant', 'Asistente'],
      ['browser.director', 'Director'],
      ['browser.secretary', 'Secretaría de control documental'],
    ];
    for (const [username, label] of operationalRoles) {
      await login(page, username, TEMPORARY_PASSWORD);
      await expect(page.getByRole('heading', { name: 'Bitácora de actividades' })).toBeVisible();
      await expect(page.getByText(label, { exact: true })).toBeVisible();
      await expect(page.getByRole('heading', { name: 'Cambie su contraseña temporal' })).toHaveCount(0);
      await logout(page);
    }

    await login(page, 'browser.admin', TEMPORARY_PASSWORD);
    await expect(page.getByRole('heading', { name: 'Bitácora de actividades' })).toBeVisible();
    await expect(page.getByText('Administrador SFyC', { exact: true })).toBeVisible();
    await logout(page);
    expect(issues).toEqual([]);
  });

  test('crea, relee y edita una RRULE anual entregada por FastAPI', async ({ page }) => {
    test.setTimeout(120_000);
    const issues = watchBrowser(page);
    await login(page, 'browser.assistant', TEMPORARY_PASSWORD);
    await expect(page.getByRole('heading', { name: 'Bitácora de actividades' })).toBeVisible();
    await page.getByRole('link', { name: /Nueva actividad/ }).first().click();

    await page.getByLabel('Título').fill('Serie anual integrada');
    await page.getByLabel('Objetivo').fill('Validar la RRULE materializada por FastAPI.');
    await page.getByLabel('Tipo de actividad').selectOption({ label: 'Taller' });
    await page.getByLabel('Modalidad').selectOption({ label: 'Presencial' });
    await page.getByLabel('Unidad o lugar').fill('Unidad efímera de recurrencia');
    await page.getByLabel('Organizador').fill('Equipo Playwright');
    await page.locator('input[name="start-at"]').fill(gtDateTime(30, 9));
    await page.locator('input[name="end-at"]').fill(gtDateTime(30, 10));
    await page.getByLabel('Actividad recurrente').check();
    await page.getByLabel('Frecuencia').selectOption('YEARLY');
    await page.getByLabel('Finaliza por').selectOption('conteo');
    await page.getByLabel('Ocurrencias').fill('3');
    await page.getByRole('button', { name: 'Guardar borrador' }).click();
    await expect(page).toHaveURL(/\/bitacora\/actividades\/\d+$/);

    // La recarga obliga a reconstruir los controles desde `{rrule: ...}`, que
    // es el contrato real del backend, no desde el objeto enriquecido del mock.
    await page.reload();
    await expect(page.getByLabel('Frecuencia')).toHaveValue('YEARLY');
    await expect(page.getByLabel('Finaliza por')).toHaveValue('conteo');
    await expect(page.getByLabel('Ocurrencias')).toHaveValue('3');
    await expect(page.getByLabel('RRULE avanzada (opcional)')).toHaveValue(/FREQ=YEARLY/);

    await page.getByLabel('Cada cuántos períodos').fill('2');
    await page.getByLabel('Esta y las futuras').check();
    const updateFinished = page.waitForResponse((response) => (
      response.request().method() === 'PUT'
      && /\/api\/bitacora\/actividades\/\d+/.test(response.url())
    ));
    await page.getByRole('button', { name: 'Guardar borrador' }).click();
    const updateResponse = await updateFinished;
    expect(updateResponse.ok()).toBe(true);
    await expect(page.getByLabel('RRULE avanzada (opcional)')).toHaveValue(/INTERVAL=2/);
    await page.reload();
    await expect(page.getByLabel('Frecuencia')).toHaveValue('YEARLY');
    await expect(page.getByLabel('Cada cuántos períodos')).toHaveValue('2');
    await expect(page.getByLabel('Ocurrencias')).toHaveValue('3');
    await logout(page);
    expect(issues).toEqual([]);
  });

  test('ciclo real enviado, devuelto, corregido, completado, reabierto y archivado', async ({ page }) => {
    test.setTimeout(240_000);
    const issues = watchBrowser(page);
    await login(page, 'browser.assistant', TEMPORARY_PASSWORD);
    await expect(page.getByRole('heading', { name: 'Bitácora de actividades' })).toBeVisible();
    await page.getByRole('link', { name: /Nueva actividad/ }).first().click();

    await page.getByLabel('Título').fill('Actividad integrada Playwright');
    await page.getByLabel('Objetivo').fill('Validar navegador, API y SQLite de forma integrada.');
    await page.getByLabel('Tipo de actividad').selectOption({ label: 'Taller' });
    await page.getByLabel('Modalidad').selectOption({ label: 'Presencial' });
    await page.getByLabel('Unidad o lugar').fill('Unidad efímera E2E');
    await page.getByLabel('Organizador').fill('Equipo Playwright');
    await page.locator('input[name="start-at"]').fill(gtDateTime(14, 9));
    await page.locator('input[name="end-at"]').fill(gtDateTime(14, 10, 30));
    await page.getByRole('button', { name: 'Guardar y continuar' }).click();
    await expect(page).toHaveURL(/\/bitacora\/actividades\/\d+$/);
    await expect(page.getByRole('heading', { name: '2. Participantes' })).toBeVisible();
    const activityUrl = page.url();
    await page.getByLabel('Nombre completo de la persona externa').fill('Participante institucional de prueba');
    await page.getByLabel('Función').fill('Asistente');
    await page.getByRole('button', { name: 'Guardar borrador' }).click();
    await page.getByRole('button', { name: /Revisión/ }).click();
    await page.getByRole('button', { name: 'Programar', exact: true }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Confirmar' }).click();
    await expect(page.getByText('Programada', { exact: true }).first()).toBeVisible();
    await page.getByRole('button', { name: 'Marcar realizada', exact: true }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Confirmar' }).click();
    await expect(page.getByText('Realizada', { exact: true }).first()).toBeVisible();

    await page.getByRole('button', { name: /Participantes/ }).click();
    await page.getByLabel('Asistencia real').selectOption('yes');
    await page.getByRole('button', { name: 'Guardar borrador' }).click();
    await page.getByRole('button', { name: /Informe/ }).click();
    const report = {
      'Actor o actores involucrados': 'Equipo institucional de prueba',
      'Qué ocurrió': 'Se desarrolló la actividad integrada prevista.',
      'Evidencia textual disponible': 'Registro automatizado verificable.',
      'Dificultades encontradas': 'No se presentaron dificultades durante la actividad.',
      'Solución implementada': 'Se mantuvo la coordinación planificada.',
      'Aprendizaje obtenido': 'La prueba integrada confirma el contrato operativo.',
    };
    for (const [label, value] of Object.entries(report)) {
      await page.getByLabel(label).fill(value);
    }
    await page.getByRole('button', { name: 'Guardar borrador' }).click();

    await page.getByRole('button', { name: /Acuerdos/ }).click();
    await page.getByLabel('Descripción').fill('Cerrar la validación integrada.');
    await page.getByLabel('Vencimiento').fill(gtDateTime(24, 12));
    await page.getByLabel('Tipo').selectOption('externo');
    await page.getByLabel('Nombre').fill('Responsable externo de prueba');
    await page.getByRole('button', { name: 'Guardar borrador' }).click();
    await page.getByRole('button', { name: /Revisión/ }).click();
    await expect(page.getByText('La documentación reúne los requisitos para enviarse.')).toBeVisible();
    await page.getByRole('button', { name: 'Enviar a control', exact: true }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Confirmar' }).click();
    await expect(page.getByText('En revisión documental', { exact: true }).first()).toBeVisible();
    await logout(page);

    await login(page, 'browser.secretary', TEMPORARY_PASSWORD);
    await page.getByRole('link', { name: 'Control documental', exact: true }).click();
    await expect(page.getByText('Actividad integrada Playwright')).toBeVisible();
    await page.getByRole('link', { name: 'Revisar documentación de Actividad integrada Playwright' }).click();
    await expect(page.getByRole('heading', { name: 'Informe de la actividad' })).toBeVisible();
    await page.getByRole('button', { name: 'Solicitar corrección' }).click();
    await page.getByRole('dialog').getByLabel('Observaciones para corregir').fill('Aclarar el aprendizaje documentado.');
    await page.getByRole('dialog').getByRole('button', { name: 'Confirmar' }).click();
    await page.getByRole('link', { name: 'Control documental' }).click();
    await expect(page.getByText('No hay documentación esperando revisión')).toBeVisible();
    await logout(page);

    await login(page, 'browser.assistant', TEMPORARY_PASSWORD);
    await expect(page.getByRole('heading', { name: 'Bitácora de actividades' })).toBeVisible();
    await page.goto(activityUrl);
    await expect(page.getByText('Requiere corrección', { exact: true }).first()).toBeVisible();
    await page.getByRole('button', { name: /Revisión/ }).click();
    await expect(page.getByRole('heading', { name: 'Corrección solicitada por Secretaría' })).toBeVisible();
    await expect(page.getByText('Aclarar el aprendizaje documentado.')).toBeVisible();
    await page.getByRole('button', { name: /Informe/ }).click();
    await page.getByLabel('Aprendizaje obtenido').fill('La revisión documental mejora la precisión del proceso integrado.');
    await page.getByRole('button', { name: 'Guardar borrador' }).click();
    await page.getByRole('button', { name: /Revisión/ }).click();
    await page.getByRole('button', { name: 'Enviar a control', exact: true }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Confirmar' }).click();
    await expect(page.getByText('En revisión documental', { exact: true }).first()).toBeVisible();
    await logout(page);

    await login(page, 'browser.secretary', TEMPORARY_PASSWORD);
    await page.getByRole('link', { name: 'Control documental' }).click();
    await page.getByRole('link', { name: 'Revisar documentación de Actividad integrada Playwright' }).click();
    await page.getByRole('button', { name: 'Marcar completa' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Confirmar' }).click();
    await page.getByRole('link', { name: 'Control documental' }).click();
    await expect(page.getByText('No hay documentación esperando revisión')).toBeVisible();

    await page.goto(activityUrl);
    await page.getByRole('button', { name: /Revisión/ }).click();
    await page.getByRole('button', { name: 'Reabrir', exact: true }).click();
    await page.getByRole('dialog').getByLabel('Motivo').fill('Se recibió una precisión documental posterior.');
    await page.getByRole('dialog').getByRole('button', { name: 'Confirmar' }).click();
    await expect(page.getByText('Requiere corrección', { exact: true }).first()).toBeVisible();
    await logout(page);

    await login(page, 'browser.assistant', TEMPORARY_PASSWORD);
    await expect(page.getByRole('heading', { name: 'Bitácora de actividades' })).toBeVisible();
    await page.goto(activityUrl);
    await page.getByRole('button', { name: /Revisión/ }).click();
    await page.getByRole('button', { name: 'Enviar a control', exact: true }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Confirmar' }).click();
    await logout(page);

    await login(page, 'browser.secretary', TEMPORARY_PASSWORD);
    await page.getByRole('link', { name: 'Control documental' }).click();
    await page.getByRole('link', { name: 'Revisar documentación de Actividad integrada Playwright' }).click();
    await page.getByRole('button', { name: 'Marcar completa' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Confirmar' }).click();
    await page.getByRole('button', { name: 'Archivar actividad' }).click();
    await page.getByRole('dialog').getByLabel('Motivo').fill('Retiro controlado del piloto integrado efímero.');
    await page.getByRole('dialog').getByRole('button', { name: 'Confirmar' }).click();
    await expect(page).toHaveURL(/\/bitacora\/actividades$/);
    await expect(page.getByText('Actividad integrada Playwright')).toHaveCount(0);
    await page.screenshot({ path: 'artifacts/playwright/bitacora-real-completa.png', fullPage: true });
    expect(issues).toEqual([]);
  });

  test('administración crea una cuenta, entrega secreto una vez y revoca su rol/sesión', async ({ request }) => {
    const adminLogin = await request.post('http://127.0.0.1:8529/api/auth/login', {
      data: { username: 'browser.admin', password: NEW_PASSWORDS['browser.admin'], fingerprint: 'admin-real-e2e' },
    });
    expect(adminLogin.status()).toBe(200);
    const adminToken = (await adminLogin.json()).token;
    const created = await request.post('http://127.0.0.1:8529/api/bitacora/admin/usuarios', {
      headers: { Authorization: `Bearer ${adminToken}`, 'Idempotency-Key': 'TEST_ONLY_admin-create-user' },
      data: {
        username: 'browser.revoked',
        nombre_completo: 'Usuario Revocable E2E',
        base_role: 'personal',
        roles: [{ rol: 'bitacora.asistente' }],
      },
    });
    expect(created.status()).toBe(201);
    const createdUser = await created.json();
    expect(createdUser.temporary_password).toBeTruthy();

    const issued = await request.post('http://127.0.0.1:8529/api/auth/login', {
      data: { username: 'browser.revoked', password: createdUser.temporary_password, fingerprint: 'revoked-real-e2e' },
    });
    expect(issued.status()).toBe(200);
    const issuedToken = (await issued.json()).token;
    const revoked = await request.post(
      `http://127.0.0.1:8529/api/bitacora/admin/usuarios/${createdUser.id}/roles/bitacora.asistente/revocar`,
      {
        headers: { Authorization: `Bearer ${adminToken}`, 'Idempotency-Key': 'TEST_ONLY_admin-revoke-role' },
        data: { motivo: 'Cambio de funciones durante la prueba integrada.' },
      }
    );
    expect(revoked.status()).toBe(200);
    const staleSession = await request.get('http://127.0.0.1:8529/api/auth/me', {
      headers: { Authorization: `Bearer ${issuedToken}` },
    });
    expect(staleSession.status()).toBe(401);
  });
});
