# Salud Familiar y Comunitaria — Portales IGSS

SPA React con 3 portales:

- `/satisfaccion/` — encuesta publica de satisfaccion (sin login).
- `/docentes/` — portal docente (rubricas, examenes).
- `/estudiantes/` — portal estudiante/residente (auto-quizzes, calificaciones).

Backend FastAPI separado en `/opt/salud-familiar-comunitaria/backend/` (puerto 8512), expuesto via nginx en `https://igss.mediclic.org/sfyc/`.

## Quickstart

```bash
npm install
cp .env.example .env
# edita .env con la URL real del backend
npm run dev      # http://localhost:5173/salud-familiar-comunitaria/
npm run build    # produce dist/
npm run preview  # sirve dist/ localmente
```

## Variables de entorno

| Variable | Default | Notas |
|----------|---------|-------|
| `VITE_API_URL` | `https://igss.mediclic.org/sfyc` | Base de los endpoints REST |
| `VITE_BASE_PATH` | `/salud-familiar-comunitaria/` | Subpath de GitHub Pages |
| `VITE_VERSION` | `dev` | Inyecta sha del commit en CI |

## Estructura

```
src/
  config/    constantes y env
  lib/       api, auth, storage, format, validators, crypto
  hooks/     useApi, useAuth, useOfflineQueue, useFormState, useDebounce, ...
  contexts/  AuthContext, ToastContext
  components/
    ui/      atomos (Button, Input, Modal, Toast, ...)
    layout/  Header, Footer, ProtectedRoute, ErrorBoundary
    shared/  LoginForm, LogoutButton, UnidadSelect, Placeholder
  portals/
    landing/      LandingPage (3 cards)
    satisfaccion/ Form publico 18 items + 6 profesionales
    docentes/     Placeholder (otro agente lo llena)
    estudiantes/  Placeholder (otro agente lo llena)
  styles/    Tailwind + animaciones
```

## Deploy

GitHub Action en `.github/workflows/deploy.yml`:
- Trigger: push a `main` o manual.
- Build con `VITE_BASE_PATH=/salud-familiar-comunitaria/`, copia `index.html` a `404.html` para SPA fallback de GitHub Pages.
- Sube a Pages.

Secret necesario en repo: `VITE_API_URL` (ya documentado en `.env.example`).

## Tests

```bash
npm run test          # Vitest
npm run lint
```

E2E (Playwright) — los stubs estan en `tests/e2e/` para implementar despues.

## Convenciones

- Codigo en ingles, UI en espanol.
- Tailwind only (paleta IGSS + sfyc semaforo en `tailwind.config.js`).
- Sin TypeScript (JSX puro) para mantener simple.
- React Router v6 con `createBrowserRouter`.

## Cross-references

- Architectura completa: `docs/sfyc_plan/05_react_portals_architecture.md`
- Convenciones canonicas: `docs/sfyc_plan/00_CANONICAL_CONVENTIONS.md`
- API spec: `docs/sfyc_plan/01_backend_api_spec.md`
