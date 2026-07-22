import { existsSync, readFileSync, realpathSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

export default function realGlobalTeardown() {
  const manifest = process.env.SFYC_E2E_CLEANUP_MANIFEST;
  if (!manifest || !existsSync(manifest)) return;

  try {
    const payload = JSON.parse(readFileSync(manifest, 'utf8'));
    const isolatedRoot = payload?.isolated_root;
    if (!isolatedRoot || !existsSync(isolatedRoot)) return;

    const resolvedRoot = realpathSync(isolatedRoot);
    const temporaryRoot = realpathSync(os.tmpdir());
    const safe = path.dirname(resolvedRoot) === temporaryRoot
      && path.basename(resolvedRoot).startsWith('sfyc-playwright-real-');
    if (!safe) {
      throw new Error(`Se rechazó limpiar un directorio E2E inesperado: ${resolvedRoot}`);
    }
    rmSync(resolvedRoot, { recursive: true, force: true });
  } finally {
    rmSync(manifest, { force: true });
  }
}
