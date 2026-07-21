# Salud Familiar y Comunitaria — Portales IGSS

SPA React con 4 portales:

- `/satisfaccion/` — encuesta publica de satisfaccion (sin login).
- `/docentes/` — portal docente (rubricas, examenes).
- `/estudiantes/` — portal estudiante/residente (auto-quizzes, calificaciones).
- `/bitacora/` — cronograma, documentación, acuerdos y control documental (JWT + RBAC).

Backend FastAPI separado en `/opt/salud-familiar-comunitaria/backend/` (puerto 8512), expuesto via nginx en `https://igss.mediclic.org/sfyc/`.

## Quickstart

```bash
npm ci
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
| `VITE_BITACORA_ENABLED` | `false` en build de Pages | Gate de publicación; habilitar junto al backend tras los smoke tests |

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
    landing/      LandingPage (4 accesos)
    satisfaccion/ Form publico 18 items + 6 profesionales
    docentes/     evaluaciones, exámenes y residentes
    estudiantes/  exámenes, evaluaciones y calificaciones
    bitacora/     dashboard, calendario, wizard, control y notificaciones
  styles/    Tailwind + animaciones
```

## Deploy

GitHub Action en `.github/workflows/deploy.yml`:
- Trigger: push a `main` o manual.
- Ejecuta lint, pruebas y build con `VITE_BASE_PATH=/salud-familiar-comunitaria/`; copia `index.html` a `404.html` para el fallback SPA de GitHub Pages.
- Sube a Pages.
- Compila Bitácora deshabilitada salvo que la variable de repositorio
  `VITE_BITACORA_ENABLED` sea exactamente `true`.

Secret necesario en repo: `VITE_API_URL` (ya documentado en `.env.example`).

## Tests

```bash
npm run test          # Vitest
npm run lint
npm run test:e2e      # Playwright/Chromium con API aislada
```

Las pruebas cubren permisos de dominio, reglas de faltantes, RRULE, conversión de
zona horaria, render del wizard y flujos de navegador con teclado, RBAC y layout
móvil. CI conserva trazas, videos y capturas únicamente cuando falla el E2E.

## Convenciones

- Código en inglés, UI en español.
- Tailwind only (paleta IGSS + sfyc semaforo en `tailwind.config.js`).
- Sin TypeScript (JSX puro) para mantener simple.
- React Router v6 con `createBrowserRouter`.

## Seguridad de Bitácora

- La interfaz usa `roles[]` y `permissions[]` para visibilidad; el backend repite toda autorización.
- Los borradores se guardan en la API. No se almacenan relatos, acuerdos ni evidencias en `localStorage`.
- No se admiten identificadores de pacientes ni datos clínicos restringidos.
- Las fechas viajan en UTC y se presentan en `America/Guatemala`.
