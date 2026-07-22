#!/usr/bin/env python3
"""Arranca FastAPI contra una SQLite migrada y descartable para Playwright."""

from __future__ import annotations

import json
import os
import shutil
import sqlite3
import sys
import tempfile
from pathlib import Path


TEST_PASSWORD = "TEST_ONLY_BrowserE2E9"  # pragma: allowlist secret


def main() -> None:
    backend_dir = Path(os.environ["SFYC_BACKEND_DIR"]).resolve()
    if not (backend_dir / "main.py").is_file():
        raise SystemExit("SFYC_BACKEND_DIR no contiene el backend SFyC")

    isolated_root = Path(tempfile.mkdtemp(prefix="sfyc-playwright-real-"))
    cleanup_manifest = os.environ.get("SFYC_E2E_CLEANUP_MANIFEST")
    if cleanup_manifest:
        manifest_path = Path(cleanup_manifest)
        manifest_path.write_text(
            json.dumps({"isolated_root": str(isolated_root)}), encoding="utf-8"
        )
        manifest_path.chmod(0o600)
    db_path = isolated_root / "sfyc.db"
    os.environ.update(
        {
            "SFYC_DB_PATH": str(db_path),
            "SFYC_ENV": "development",
            "SFYC_BITACORA_ENABLED": "true",
            "SFYC_ALLOWED_ORIGINS": "http://127.0.0.1:4273",
            "SFYC_EVIDENCE_ROOT": str(isolated_root / "evidence"),
            "SFYC_JWT_SECRET": "TEST_ONLY_ephemeral_jwt_secret_64_chars_never_for_production_123456",
        }
    )
    sys.path.insert(0, str(backend_dir))
    os.chdir(backend_dir)

    try:
        from migrations.migrate import apply_pending

        applied = apply_pending(str(db_path), verbose=False)
        if applied < 13:
            raise RuntimeError(f"Se esperaban al menos 13 migraciones; se aplicaron {applied}")

        from auth import hash_password

        accounts = (
            ("browser.assistant", "Asistente API Real", "personal", "bitacora.asistente"),
            ("browser.director", "Director API Real", "personal", "bitacora.director"),
            ("browser.secretary", "Secretaría API Real", "personal", "bitacora.secretaria"),
            ("browser.admin", "Administración API Real", "admin", None),
        )
        conn = sqlite3.connect(db_path)
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA foreign_keys=ON")
        for username, name, base_role, domain_role in accounts:
            must_change = 0 if domain_role else 1
            cursor = conn.execute(
                """INSERT INTO usuarios_sfyc
                   (username,password_hash,rol,activo,password_reset_required)
                   VALUES (?,?,?,1,?)""",
                (username, hash_password(TEST_PASSWORD), base_role, must_change),
            )
            user_id = int(cursor.lastrowid)
            conn.execute(
                "INSERT INTO bitacora_perfiles(usuario_id,nombre_completo) VALUES (?,?)",
                (user_id, name),
            )
            if domain_role:
                conn.execute(
                    "INSERT INTO bitacora_usuario_roles(usuario_id,rol_clave) VALUES (?,?)",
                    (user_id, domain_role),
                )
        conn.commit()
        integrity = conn.execute("PRAGMA integrity_check").fetchone()[0]
        foreign_keys = conn.execute("PRAGMA foreign_key_check").fetchall()
        conn.close()
        if integrity != "ok" or foreign_keys:
            raise RuntimeError("La SQLite efímera no superó sus verificaciones")

        import uvicorn
        import main as app_module
        from routes import auth as auth_routes

        # Esta matriz ejerce múltiples sesiones válidas en pocos segundos. El rate limit
        # tiene pruebas backend propias; se desactiva solo dentro del proceso efímero.
        auth_routes._rate_limiter.check = lambda *_args, **_kwargs: True
        uvicorn.run(app_module.app, host="127.0.0.1", port=8529, log_level="warning", access_log=False)
    finally:
        shutil.rmtree(isolated_root, ignore_errors=True)


if __name__ == "__main__":
    main()
