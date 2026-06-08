# easy to-task — Memoria del proyecto

> Este archivo es la fuente de verdad del proyecto. Actualízalo siempre que cambies arquitectura, añadas features o corrijas bugs importantes.

---

## Identidad

| Campo | Valor |
|-------|-------|
| Nombre app | **easy to-task** |
| Short name | **et** |
| App ID (Electron) | `com.easytotask.app` |
| App ID (Android TWA) | `com.easytotask.app.twa` |
| Supabase URL | `https://ykhzmxgorxntuquinkjo.supabase.co` |
| Netlify publish dir | `project/` |
| Storage key localStorage | `tareas.app.v2` |

---

## Arquitectura general

```
easy to-task/
├── main.js                  # Electron main process (2 ventanas + tray)
├── preload.js               # contextBridge → electronAPI
├── package.json             # electron-builder, productName: easy to-task
├── netlify.toml             # proxy Supabase + SPA fallback
├── MEMORY.md                # este archivo
├── CHANGELOG.md             # historial de cambios
└── project/
    ├── index.html           # App principal (todo el JS inline)
    ├── widget-standalone.html  # Widget flotante (Electron)
    ├── manifest.json        # PWA manifest
    ├── sw.js                # Service worker (cache: easytotask-v1)
    ├── icon-192.png / icon-512.png / favicon.ico
    └── .well-known/
        └── assetlinks.json  # Android TWA fingerprint
```

---

## Stack técnico

| Capa | Tecnología |
|------|-----------|
| Desktop | Electron (portable .exe) |
| Web/iOS | PWA en Netlify |
| Android | TWA via PWABuilder |
| Auth | Supabase Auth (email + password) |
| Base de datos | Supabase PostgreSQL (`app_data` table) |
| Sync | REST fetch directo (Electron) / proxy Netlify (web) |
| Local cache | localStorage (`tareas.app.v2`) |

---

## Supabase

### Tabla `app_data`

```sql
CREATE TABLE app_data (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id),
  data    JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE app_data ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own data" ON app_data
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
```

### Variables globales de sync (index.html)

```javascript
const SUPA_URL  = 'https://ykhzmxgorxntuquinkjo.supabase.co';
const SUPA_KEY  = 'eyJhbGci...';  // anon key
const STORE_KEY = 'tareas.app.v2';

let supa         = null;   // Supabase JS client (auth)
let currentUser  = null;   // set AFTER pullFromCloud() completa
let _authUser    = null;   // set inmediatamente en onAuthStateChange
let _accessToken = null;   // JWT vigente
let _syncTimer   = null;   // debounce push (2s)
```

### URL de datos (proxy web vs directo Electron)

```javascript
const DATA_URL = () => isElectron()
  ? `${SUPA_URL}/rest/v1/app_data`       // directo
  : `/api/supabase/rest/v1/app_data`;    // proxy Netlify
```

### Flujo de sync

1. **Login** → `onAuthStateChange` → `_authUser = user` → `pullFromCloud(user, force=true)` → `currentUser = user` (push habilitado)
2. **Edición** → `save()` → `scheduleSync()` (debounce 2s) → `dbFetch('POST', uid, state)`
3. **Pull periódico** cada 30s y en `visibilitychange` → compara JSON → re-renderiza solo si datos cambiaron
4. **401** → auto-refresh token con `supa.auth.refreshSession()` → reintento → si falla, error "Sesión expirada"

### `safeMerge(local, cloud)`
Une arrays por `id`; local gana en conflictos. Previene pérdida de datos al hacer pull.

---

## Electron

### Dos ventanas
- **mainWin** — app principal (`project/index.html`), se oculta al cerrar (no se destruye)
- **widgetWin** — widget flotante (`project/widget-standalone.html`), `alwaysOnTop: true`, frameless

### IPC channels
| Canal | Dirección | Acción |
|-------|-----------|--------|
| `widget-close` | renderer → main | oculta widgetWin |
| `widget-minimize` | renderer → main | minimiza widgetWin |
| `show-main` | renderer → main | muestra mainWin |
| `open-widget` | renderer → main | muestra widgetWin |
| `data-changed` | renderer → main | broadcast `reload-data` a otras ventanas |
| `reload-data` | main → renderer | recarga estado local |

### electronAPI (preload.js)
```javascript
window.electronAPI = {
  closeWidget, minimizeWidget, showMainApp,
  openWidget, notifyChange, onDataChanged
}
```

### FAB en Electron
El `main.js` inyecta JS después de cargar para redirigir el FAB a `openWidget()` en lugar del panel embebido.

---

## PWA / Android

### Service worker (`sw.js`)
- Cache name: `easytotask-v1`
- Estrategia: **network-first**, fallback a cache
- Shell cacheado: `/`, `/index.html`, `/manifest.json`

### iOS
- `<meta name="apple-mobile-web-app-capable" content="yes">`
- "Añadir a pantalla de inicio" desde Safari

### Android APK (TWA)
1. Deploy en Netlify
2. [pwabuilder.com](https://pwabuilder.com) → pega URL → Build → Android → Generate Package
3. Reemplazar `project/.well-known/assetlinks.json` con el del ZIP descargado
4. Instalar `.apk` directamente en el dispositivo

---

## Secciones de la app

| Sección | Estado |
|---------|--------|
| Resumen (dashboard) | ✅ |
| Pendientes | ✅ con filtros por tag + tags personalizados |
| Sencillas | ✅ |
| Apuntes | ✅ |
| Avisos (reminders) | ✅ |
| Grupos de trabajo | ✅ |
| Ajustes | ✅ email + sync manual + logout |
| Widget flotante | ✅ Sencillas / Apuntes / Avisos |
| Auth (login/register) | ✅ overlay pantalla completa |

---

## Decisiones de diseño importantes

- **`currentUser` se setea DESPUÉS de `pullFromCloud()`** — evita race condition donde `save()` pushea estado vacío antes de que lleguen los datos de la nube.
- **`_authUser` se setea INMEDIATAMENTE** — para mostrar el email en Ajustes aunque el pull no haya terminado.
- **`TOKEN_REFRESHED` retorna early** — evita que el re-trigger de `onAuthStateChange` vuelva a hacer pull y setee `currentUser = null` temporalmente.
- **`renderAll()` solo si datos cambiaron** — comparación JSON antes de re-renderizar en cada pull periódico, elimina el parpadeo visible.
- **Proxy Netlify para web** — iOS Safari bloqueaba fetch directo a Supabase por restricciones de red. El proxy mismo-origen resuelve CORS y timeouts.

---

## Cuenta de usuario (propietario)

- Email: `airamc@tiforbi.com`
- Auth: Supabase email + password
- Datos en nube: tabla `app_data`, `user_id = auth.uid()`
