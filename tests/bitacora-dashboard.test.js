import { describe, expect, it } from 'vitest';
import { chronological } from '../src/portals/bitacora/pages/DashboardPage';

describe('resumen de próximas actividades', () => {
  it('presenta primero la ocurrencia futura más cercana', () => {
    const result = chronological([
      { id: 3, inicio_at: '2026-07-25T14:00:00Z' },
      { id: 1, inicio_at: '2026-07-22T14:00:00Z' },
      { id: 2, inicio_at: '2026-07-23T14:00:00Z' },
    ]);
    expect(result.map((item) => item.id)).toEqual([1, 2, 3]);
  });
});
