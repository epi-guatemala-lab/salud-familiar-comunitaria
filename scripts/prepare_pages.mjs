import { copyFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

export const STATIC_ROUTES = Object.freeze([
  'satisfaccion',
  'satisfaccion/gracias',
  'docentes',
  'docentes/login',
  'docentes/residentes',
  'docentes/evaluaciones/nueva',
  'docentes/examenes',
  'docentes/examenes/nuevo',
  'docentes/preguntas',
  'docentes/respuestas-abiertas',
  'estudiantes',
  'estudiantes/login',
  'estudiantes/examenes',
  'estudiantes/calificaciones',
  'estudiantes/calendario',
  'estudiantes/boleta',
  'bitacora',
  'bitacora/login',
  'bitacora/cambiar-contrasena',
  'bitacora/calendario',
  'bitacora/actividades',
  'bitacora/actividades/nueva',
  'bitacora/control',
  'bitacora/notificaciones',
]);

function safeRoute(route) {
  const normalized = path.posix.normalize(String(route || ''));
  if (!normalized || normalized === '.' || normalized.startsWith('../') || path.isAbsolute(normalized)) {
    throw new Error(`Ruta SPA insegura: ${route}`);
  }
  return normalized;
}

export async function preparePages(distDirectory, routes = STATIC_ROUTES) {
  const dist = path.resolve(distDirectory);
  const index = path.join(dist, 'index.html');
  await copyFile(index, path.join(dist, '404.html'));

  for (const route of new Set(routes.map(safeRoute))) {
    const destination = path.join(dist, ...route.split('/'));
    await mkdir(destination, { recursive: true });
    await copyFile(index, path.join(destination, 'index.html'));
  }
}

const invokedPath = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : null;
if (invokedPath === import.meta.url) {
  preparePages(path.resolve('dist')).catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
