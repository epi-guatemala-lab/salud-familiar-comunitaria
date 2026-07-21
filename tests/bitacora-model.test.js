import { describe, expect, it } from 'vitest';
import {
  allMissingFields,
  buildRRule,
  dateBoundaryUtc,
  initialDraft,
  normalizePaginated,
  programmingMissingFields,
  serializeAgreement,
  serializeActivity,
  serializeParticipants,
  toUtcIso,
} from '../src/portals/bitacora/model';

describe('modelo de Bitácora', () => {
  it('normaliza siempre el contrato paginado', () => {
    expect(normalizePaginated([{ id: 1 }, { id: 2 }])).toEqual({
      items: [{ id: 1 }, { id: 2 }],
      total: 2,
      page: 1,
      limit: 2,
    });
    expect(normalizePaginated({ items: [{ id: 1 }], total: 190, page: 2, limit: 20 })).toEqual({
      items: [{ id: 1 }], total: 190, page: 2, limit: 20,
    });
  });

  it('detecta los requisitos de programación y documentación futura', () => {
    const draft = initialDraft();
    expect(programmingMissingFields(draft)).toContain('Título');
    expect(programmingMissingFields(draft, [{
      clave: 'cobertura',
      nombre: 'Cobertura territorial',
      requerido: true,
    }])).toContain('Campo requerido: Cobertura territorial');
    expect(allMissingFields(draft)).toEqual(expect.arrayContaining([
      'Título',
      'Actor o actores involucrados',
      'Al menos un acuerdo completo',
    ]));

    draft.legacy_import = true;
    expect(allMissingFields(draft)).toEqual([]);
  });

  it('construye recurrencias diarias, semanales, mensuales y anuales con fin', () => {
    for (const frecuencia of ['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY']) {
      expect(buildRRule({
        enabled: true,
        frecuencia,
        intervalo: 2,
        fin_tipo: 'conteo',
        conteo: 12,
      })).toBe(`FREQ=${frecuencia};INTERVAL=2;COUNT=12`);
    }
    expect(buildRRule({ enabled: true, rrule: 'FREQ=WEEKLY;BYDAY=MO,WE;COUNT=8' }))
      .toBe('FREQ=WEEKLY;BYDAY=MO,WE;COUNT=8');
    expect(buildRRule({ enabled: true, rrule: 'FREQ=HOURLY;COUNT=8' })).toBeNull();
    expect(buildRRule({ enabled: true, rrule: 'FREQ=WEEKLY;BYDAY=MO' })).toBeNull();
  });

  it('convierte datetime-local de Guatemala a UTC antes de enviarlo', () => {
    expect(toUtcIso('2026-07-21T08:30')).toBe('2026-07-21T14:30:00.000Z');
    const draft = initialDraft();
    Object.assign(draft, {
      titulo: 'Jornada comunitaria',
      objetivo: 'Coordinar acciones',
      tipo: 'Jornada',
      unidad_lugar: 'Unidad Central',
      modalidad: 'Presencial',
      inicio_at: '2026-07-21T08:30',
      fin_at: '2026-07-21T10:30',
      organizador: 'SFyC',
      etiquetas: [{ id: 7, nombre: 'Territorial' }],
      campos_personalizados: { cobertura: 'Nacional' },
    });
    expect(serializeActivity(draft)).toMatchObject({
      inicio_at: '2026-07-21T14:30:00.000Z',
      fin_at: '2026-07-21T16:30:00.000Z',
      recurrencia: null,
      etiquetas: [7],
      campos_personalizados: { cobertura: 'Nacional' },
    });
    expect(dateBoundaryUtc('2026-07-21')).toBe('2026-07-21T06:00:00Z');
    expect(dateBoundaryUtc('2026-07-21', true)).toBe('2026-07-22T05:59:59Z');
  });

  it('serializa referencias nominales internas sin convertirlas en actores externos', () => {
    expect(serializeParticipants([{
      usuario_id: '7',
      nombre: 'Persona institucional',
      convocado: true,
      asistio: null,
    }])).toEqual([expect.objectContaining({
      usuario_id: 7,
      nombre: null,
      nombre_externo: null,
      asistencia: 'PENDIENTE',
    })]);

    expect(serializeAgreement({
      descripcion: 'Dar seguimiento',
      responsables: [{ tipo: 'interno', usuario_id: '7', nombre: 'Persona institucional' }],
      vencimiento_at: '2026-07-30T08:00',
      prioridad: 'MEDIA',
      estado: 'PENDIENTE',
    })).toMatchObject({
      responsables: [{ usuario_id: 7, nombre: null, nombre_externo: null }],
      vencimiento_at: '2026-07-30T14:00:00.000Z',
    });
  });
});
