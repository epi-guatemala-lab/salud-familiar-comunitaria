import { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ActivityFilters, { EMPTY_FILTERS } from '../src/portals/bitacora/components/ActivityFilters';
import { bitacoraApi } from '../src/portals/bitacora/api';

function Harness() {
  const [filters, setFilters] = useState({ ...EMPTY_FILTERS });
  return (
    <ActivityFilters
      value={filters}
      onChange={setFilters}
      onReset={() => setFilters({ ...EMPTY_FILTERS })}
    />
  );
}

describe('filtros administrables de Bitácora', () => {
  beforeEach(() => {
    vi.spyOn(bitacoraApi, 'listCatalogValues').mockImplementation((key) => Promise.resolve({
      items: key === 'tipo_actividad'
        ? [{ id: 1, clave: 'TALLER', nombre: 'Taller territorial' }]
        : [{ id: 2, clave: 'COMUNITARIA', nombre: 'Comunitaria' }],
      total: 1,
      page: 1,
      limit: 500,
    }));
    vi.spyOn(bitacoraApi, 'getConfiguration').mockResolvedValue({
      etiquetas: [{ id: 4, nombre: 'Prioritaria', color: '#A00000' }],
      campos_personalizados: [{
        id: 9,
        clave: 'poblacion_estimada',
        nombre: 'Población estimada',
        tipo: 'NUMBER',
        requerido: false,
        opciones: [],
      }],
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('usa tipo, clasificación, etiqueta y valor tipado desde configuración', async () => {
    render(<Harness />);
    expect(await screen.findByRole('option', { name: 'Taller territorial' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Comunitaria' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Prioritaria' })).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Campo institucional'), {
      target: { value: 'poblacion_estimada' },
    });

    const value = screen.getByLabelText('Valor: Población estimada');
    expect(value).toHaveAttribute('type', 'number');
  });
});
