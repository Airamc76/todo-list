# Changelog — easy to-task

Todos los cambios relevantes del proyecto. Formato: `[tipo] descripción — archivo(s)`.

Tipos: `feat` nueva función · `fix` corrección · `perf` rendimiento · `refactor` reestructura · `chore` config/infra · `docs` documentación

---

## [Unreleased]

---

## 2026-06-07

### fix — Sin parpadeo al sincronizar
- `pullFromCloud()` ahora compara el JSON de la nube con el estado local antes de llamar `renderAll()`
- Si los datos son idénticos → solo actualiza el toast de estado, sin tocar el DOM
- Si los datos cambiaron → re-renderiza normalmente
- **Archivo:** `project/index.html` (función `pullFromCloud`)

### feat — Soporte Android APK (TWA)
- Añadido `project/.well-known/assetlinks.json` para verificación de dominio Android
- `manifest.json` actualizado con `scope`, `lang`, `categories` y `shortcuts` (Pendientes, Sencillas)
- `netlify.toml` actualizado: proxy Supabase + regla `.well-known` + SPA fallback
- **Archivos:** `project/.well-known/assetlinks.json`, `project/manifest.json`, `netlify.toml`

### docs — Memoria y changelog del proyecto
- Creado `MEMORY.md` con arquitectura completa, stack, Supabase schema, Electron IPC, decisiones de diseño
- Creado `CHANGELOG.md` (este archivo)
- **Archivos:** `MEMORY.md`, `CHANGELOG.md`

---

## 2026-06-06

### fix — HTTP 401 con auto-refresh de token
- `dbFetch()` detecta respuesta 401 → llama `supa.auth.refreshSession()` → actualiza `_accessToken` → reintenta la petición una vez
- Si el refresh falla → lanza error "Sesión expirada — vuelve a iniciar sesión"
- **Archivo:** `project/index.html` (función `dbFetch`)

### fix — Proxy Netlify para iOS Safari
- iOS Safari bloqueaba fetch directo a Supabase (timeouts de 12s)
- `netlify.toml` añade proxy `/api/supabase/* → https://ykhzmxgorxntuquinkjo.supabase.co/:splat`
- `DATA_URL()` usa proxy mismo-origen en web, URL directa en Electron
- **Archivos:** `netlify.toml`, `project/index.html`

### fix — Race condition push vacío al login
- `currentUser` ahora se setea DESPUÉS de que `pullFromCloud()` completa
- Antes: `save()` podía pushear estado vacío porque `currentUser` ya existía mientras el pull aún cargaba
- **Archivo:** `project/index.html` (función `onAuthStateChange`)

### fix — TOKEN_REFRESHED no dispara pull duplicado
- `onAuthStateChange` retorna early en evento `TOKEN_REFRESHED` (pero sí actualiza `_accessToken`)
- Antes: el re-trigger causaba `currentUser = null` temporalmente, rompiendo pushes en curso
- **Archivo:** `project/index.html`

### fix — Botón logout no funcionaba en re-renders
- Listener directo en elemento se perdía al re-renderizar `innerHTML` de Ajustes
- Refactorizado a delegación: `document.addEventListener('click')` único que cubre logout, sync, login
- **Archivo:** `project/index.html`

### fix — Nav móvil cortaba sección Ajustes
- Grid era `repeat(6, 1fr)` con 7 ítems → Ajustes se salía del viewport
- Corregido a `repeat(7, 1fr)`
- **Archivo:** `project/index.html`

### fix — Service worker cacheaba HTML viejo en iOS
- Bumped cache de `todolist-v1` → `easytotask-v1` para forzar invalidación
- **Archivo:** `project/sw.js`

### fix — Pérdida de datos al hacer pull
- `pullFromCloud()` sobreescribía estado local completo con datos de nube
- Implementado `safeMerge(local, cloud)`: une arrays por `id`, local gana en conflictos
- **Archivo:** `project/index.html`

---

## 2026-06-05

### feat — Sync Supabase entre desktop y web/iOS
- Tabla `app_data` en Supabase con RLS (`auth.uid() = user_id`)
- `dbFetch()` con soporte GET/POST y headers JWT
- Push con debounce 2s (`scheduleSync`), pull periódico cada 30s
- Pull en `visibilitychange` (al volver a la pestaña)
- Toast de estado sync en mobile (`#sync-toast`)
- **Archivo:** `project/index.html`

### feat — Auth con Supabase (email + password)
- Overlay de pantalla completa con formulario login/registro
- `onAuthStateChange` gestiona sesión, pull inicial y logout
- Ajustes muestra email + botón "Sincronizar ahora" + "Cerrar sesión"
- **Archivo:** `project/index.html`

### chore — Deploy Netlify + PWA iOS
- `netlify.toml` con `publish = "project"`
- `manifest.json` para PWA
- `sw.js` service worker network-first
- `index.html` con meta tags iOS (`apple-mobile-web-app-capable`)
- **Archivos:** `netlify.toml`, `project/manifest.json`, `project/sw.js`, `project/index.html`

---

## 2026-06-04

### feat — Widget flotante independiente (Electron)
- `widget-standalone.html`: ventana frameless, `alwaysOnTop`, tabs Sencillas/Apuntes/Avisos
- Sincronización bidireccional via IPC `data-changed` / `reload-data`
- Widget persiste aunque se cierre la ventana principal
- System tray con opciones "Mostrar/Ocultar app" y "Mostrar/Ocultar widget"
- **Archivos:** `main.js`, `preload.js`, `project/widget-standalone.html`

### feat — Filtros por tag en Pendientes
- Chips de filtro encima de la lista de pendientes
- Tags por defecto + tags personalizados creables desde la UI
- **Archivo:** `project/index.html`

### chore — Empaquetado Electron como .exe portable
- `package.json` con `electron-builder`, target `portable`, `productName: easy to-task`
- Build: `npm run build` → `dist/easy to-task.exe`
- **Archivo:** `package.json`

### chore — Renombrado a easy to-task
- Antes: `todolist-builtbyac`
- App ID: `com.easytotask.app`
- **Archivos:** `package.json`, `main.js`, `project/manifest.json`
