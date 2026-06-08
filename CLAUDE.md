# Instrucciones para Claude — easy to-task

## OBLIGATORIO en cada sesión

1. **Leer `MEMORY.md`** al inicio para entender la arquitectura actual antes de hacer cualquier cambio.
2. **Actualizar `CHANGELOG.md`** al final de cada sesión con los cambios realizados:
   - Fecha: `YYYY-MM-DD`
   - Tipo: `feat` / `fix` / `perf` / `refactor` / `chore` / `docs`
   - Descripción clara del cambio
   - Archivo(s) modificado(s)
3. **Actualizar `MEMORY.md`** si cambia arquitectura, se añade una sección nueva, o cambia alguna decisión de diseño importante.

## Reglas del proyecto

- **NO tocar datos de Supabase** directamente — solo el schema SQL si es estrictamente necesario y con confirmación del usuario.
- **NO cambiar el `STORE_KEY`** (`tareas.app.v2`) — rompería localStorage de todos los usuarios.
- **NO cambiar `SUPA_KEY`** sin actualizar también `netlify.toml` y el proxy.
- **`currentUser`** siempre se setea DESPUÉS de `pullFromCloud()` — no romper este orden.
- Al hacer cambios en `index.html`, verificar que `scheduleSync()` sigue llamándose desde `save()`.
- El service worker tiene cache `easytotask-v1` — si se actualiza HTML crítico, bumpar la versión del cache.

## Estructura de archivos clave

```
main.js              → Electron main process
preload.js           → electronAPI bridge
project/index.html   → TODO el JS de la app (inline)
project/sw.js        → Service worker
project/manifest.json → PWA manifest
project/.well-known/assetlinks.json → Android TWA
netlify.toml         → proxy + SPA fallback
MEMORY.md            → arquitectura y decisiones
CHANGELOG.md         → historial de cambios
```

## Cómo buildear el .exe

```bash
cd "C:\Users\Airam\Desktop\to do list-AIram"
npm run build
# Output: dist/easy to-task.exe
# Copiar al escritorio del usuario
```
