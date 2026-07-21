import { afterEach, describe, expect, it, vi } from 'vitest';
import { api } from '../src/lib/api';
import { bitacoraApi } from '../src/portals/bitacora/api';

describe('cliente API de Bitácora', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('envía alcance e If-Match en acciones de una serie', async () => {
    const post = vi.spyOn(api, 'post').mockResolvedValue({ ok: true });

    await bitacoraApi.action(
      17,
      'cancelar',
      { motivo: 'Cambio institucional' },
      { version: 4, scope: 'future', idempotencyKey: 'cancelar-prueba' }
    );

    expect(post).toHaveBeenCalledWith(
      '/api/bitacora/actividades/17/cancelar?scope=future',
      { motivo: 'Cambio institucional' },
      {
        headers: {
          'If-Match': '4',
          'Idempotency-Key': 'cancelar-prueba',
        },
        maxRetries: 2,
      }
    );
  });

  it('consulta personas y catálogos con el contrato paginado', async () => {
    const get = vi.spyOn(api, 'get').mockResolvedValue({ items: [], total: 0, page: 1, limit: 50 });

    await bitacoraApi.listPeople({ q: 'Pavel Aguilar', limit: 50 });
    await bitacoraApi.listCatalogValues('tipo_actividad', { page: 1, limit: 500 });
    await bitacoraApi.getConfiguration();
    await bitacoraApi.listNotifications({ page: 1, leida: false });
    await bitacoraApi.listActivities({ campo_clave: 'poblacion', campo_valor: '' });

    expect(get).toHaveBeenNthCalledWith(
      1,
      '/api/bitacora/personas?q=Pavel+Aguilar&limit=50'
    );
    expect(get).toHaveBeenNthCalledWith(
      2,
      '/api/bitacora/catalogos/tipo_actividad/valores?page=1&limit=500'
    );
    expect(get).toHaveBeenNthCalledWith(3, '/api/bitacora/configuracion');
    expect(get).toHaveBeenNthCalledWith(
      4,
      '/api/bitacora/notificaciones?page=1&leida=false'
    );
    expect(get).toHaveBeenNthCalledWith(5, '/api/bitacora/actividades');
  });
});
