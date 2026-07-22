import { describe, expect, it } from 'vitest';
import {
  allMissingFields,
  buildRRule,
  activityToDraft,
  dateBoundaryUtc,
  initialDraft,
  normalizePaginated,
  programmingMissingFields,
  parseRRule,
  rewriteRRule,
  serializeAgreement,
  serializeActivity,
  serializeReport,
  serializeParticipants,
  toUtcIso,
  validateEvidenceFiles,
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

  it('no reenvía metadatos de solo lectura al guardar un informe corregido', () => {
    const serialized = serializeReport({
      id: 99,
      actividad_id: 7,
      version: 3,
      updated_at: '2026-07-21T00:00:00Z',
      actor_involucrado: '  Equipo institucional  ',
      que_ocurrio: 'Actividad realizada',
      evidencia_disponible: 'Minuta',
      dificultades: 'Sin dificultades',
      solucion: 'Coordinación',
      aprendizaje: 'Lección documentada',
    });
    expect(serialized).toEqual({
      actor_involucrado: 'Equipo institucional',
      que_ocurrio: 'Actividad realizada',
      evidencia_disponible: 'Minuta',
      dificultades: 'Sin dificultades',
      solucion: 'Coordinación',
      aprendizaje: 'Lección documentada',
    });
  });

  it('rechaza formato, tamaño individual y total excesivos de evidencias', () => {
    expect(validateEvidenceFiles([
      { name: 'archivo.exe', type: 'application/x-msdownload', size: 10 },
    ])).toContain('archivo.exe: formato no permitido.');
    expect(validateEvidenceFiles([
      { name: 'grande.pdf', type: 'application/pdf', size: 25 * 1024 * 1024 + 1 },
    ])).toContain('grande.pdf: supera 25 MiB.');
    expect(validateEvidenceFiles([
      { name: 'adicional.pdf', type: 'application/pdf', size: 2 * 1024 * 1024 },
    ], 99 * 1024 * 1024)).toContain('La actividad supera 100 MiB de evidencias.');
  });

  it('interpreta la RRULE que realmente devuelve FastAPI al editar una serie', () => {
    const draft = activityToDraft({
      id: 31,
      titulo: 'Serie anual',
      recurrencia: {
        enabled: true,
        serie_id: 9,
        timezone: 'America/Guatemala',
        rrule: 'FREQ=YEARLY;INTERVAL=2;BYMONTH=7;BYMONTHDAY=21;COUNT=4',
      },
    });
    expect(draft.recurrencia).toMatchObject({
      enabled: true,
      frecuencia: 'YEARLY',
      intervalo: 2,
      fin_tipo: 'conteo',
      conteo: 4,
      bymonth: ['7'],
      bymonthday: ['21'],
    });
  });

  it('conserva la última devolución para que el colaborador vea qué corregir', () => {
    const ultimaDevolucion = {
      observaciones: 'Ampliar el aprendizaje documentado.',
      created_at: '2026-07-22T14:30:00Z',
      usuario_nombre: 'Teresa',
    };
    expect(activityToDraft({
      id: 42,
      estado_documentacion: 'REQUIERE_CORRECCION',
      ultima_devolucion: ultimaDevolucion,
    }).ultima_devolucion).toEqual(ultimaDevolucion);
  });

  it('convierte UNTIL UTC a la fecha de Guatemala y conserva componentes avanzados', () => {
    expect(parseRRule(
      'RRULE:FREQ=MONTHLY;INTERVAL=1;BYDAY=MO,TU;BYSETPOS=-1;UNTIL=20260806T055900Z'
    )).toMatchObject({
      frecuencia: 'MONTHLY',
      intervalo: 1,
      fin_tipo: 'fecha',
      hasta: '2026-08-05',
      byday: ['MO', 'TU'],
      bysetpos: ['-1'],
    });
  });

  it('reescribe frecuencia y final sin perder BYDAY ni otros componentes RFC 5545', () => {
    const rewritten = rewriteRRule(
      'FREQ=WEEKLY;INTERVAL=1;BYDAY=MO,WE;WKST=MO;COUNT=8',
      {
        frecuencia: 'MONTHLY',
        intervalo: 2,
        fin_tipo: 'fecha',
        hasta: '2026-08-05',
      }
    );
    expect(rewritten).toContain('FREQ=MONTHLY');
    expect(rewritten).toContain('INTERVAL=2');
    expect(rewritten).toContain('BYDAY=MO,WE');
    expect(rewritten).toContain('WKST=MO');
    expect(rewritten).not.toContain('COUNT=');
    expect(rewritten).toContain('UNTIL=20260806T055900Z');
  });
});
