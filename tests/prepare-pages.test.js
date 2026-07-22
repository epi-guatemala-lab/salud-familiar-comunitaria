import { mkdtemp, readFile, rm, writeFile, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import { preparePages, STATIC_ROUTES } from '../scripts/prepare_pages.mjs';

const temporaryDirectories = [];

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map((directory) => (
    rm(directory, { recursive: true, force: true })
  )));
});

describe('preparePages', () => {
  it('crea fallback y entradas 200 para cada ruta estática', async () => {
    const root = await mkdtemp(path.join(tmpdir(), 'sfyc-pages-'));
    temporaryDirectories.push(root);
    const dist = path.join(root, 'dist');
    await mkdir(dist);
    await writeFile(path.join(dist, 'index.html'), '<html>SFyC</html>');

    await preparePages(dist);

    expect(await readFile(path.join(dist, '404.html'), 'utf8')).toBe('<html>SFyC</html>');
    for (const route of STATIC_ROUTES) {
      expect(await readFile(path.join(dist, route, 'index.html'), 'utf8')).toBe('<html>SFyC</html>');
    }
  });

  it('rechaza rutas que salgan del artefacto', async () => {
    const root = await mkdtemp(path.join(tmpdir(), 'sfyc-pages-'));
    temporaryDirectories.push(root);
    const dist = path.join(root, 'dist');
    await mkdir(dist);
    await writeFile(path.join(dist, 'index.html'), '<html>SFyC</html>');

    await expect(preparePages(dist, ['../outside'])).rejects.toThrow('Ruta SPA insegura');
  });
});
