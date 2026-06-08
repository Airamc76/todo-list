const { app, BrowserWindow, Tray, Menu, nativeImage, ipcMain, screen } = require('electron')
const path = require('path')

let mainWin, widgetWin, tray

const preload = path.join(__dirname, 'preload.js')

// ── Main app window ──────────────────────────────────────────────
function createMainWindow() {
  mainWin = new BrowserWindow({
    width: 1280, height: 820,
    minWidth: 380, minHeight: 500,
    title: 'easy to-task',
    icon: path.join(__dirname, 'icon.ico'),
    webPreferences: { preload, nodeIntegration: false, contextIsolation: true },
    autoHideMenuBar: true,
    backgroundColor: '#faf7f2',
    show: false
  })
  mainWin.loadFile(path.join(__dirname, 'project', 'index.html'))
  mainWin.once('ready-to-show', () => mainWin.show())

  // Inject sync + FAB redirect after page loads
  mainWin.webContents.on('did-finish-load', () => {
    mainWin.webContents.executeJavaScript(`
      (function() {
        if (!window.electronAPI) return;

        // 1) Redirect FAB to open standalone widget window
        const fab = document.getElementById('fab');
        const embeddedWidget = document.getElementById('widget');
        if (embeddedWidget) embeddedWidget.hidden = true;
        if (fab) {
          const newFab = fab.cloneNode(true);
          fab.parentNode.replaceChild(newFab, fab);
          newFab.addEventListener('click', (e) => {
            e.stopImmediatePropagation();
            window.electronAPI.openWidget();
          });
        }

        // 2) When widget saves data → reload local state, re-render, push to Supabase
        //    (index.html already calls notifyChange() inside save(), no wrapping needed)
        window.electronAPI.onDataChanged(() => {
          if (typeof load === 'function' && typeof renderAll === 'function') {
            state = load();
            renderAll();
            if (typeof scheduleSync === 'function') scheduleSync();
          }
        });
      })();
    `).catch(() => {})
  })

  // Hide to tray instead of quitting
  mainWin.on('close', e => {
    e.preventDefault()
    mainWin.hide()
    updateTrayMenu()
  })
}

// ── Widget window ────────────────────────────────────────────────
function createWidgetWindow() {
  const { width: sw, height: sh } = screen.getPrimaryDisplay().workAreaSize

  widgetWin = new BrowserWindow({
    width: 320, height: 440,
    x: sw - 340, y: sh - 480,
    minWidth: 280, minHeight: 200,
    maxWidth: 520, maxHeight: 700,
    title: 'Acceso rápido — easy to-task',
    icon: path.join(__dirname, 'icon.ico'),
    frame: false,
    transparent: false,
    alwaysOnTop: true,
    skipTaskbar: false,
    resizable: true,
    webPreferences: { preload, nodeIntegration: false, contextIsolation: true },
    backgroundColor: '#ffffff',
    show: false
  })
  widgetWin.loadFile(path.join(__dirname, 'project', 'widget-standalone.html'))
  widgetWin.once('ready-to-show', () => {
    // Widget starts hidden; opens via FAB or tray right-click
  })

  widgetWin.on('show', () => updateTrayMenu())
  widgetWin.on('hide', () => updateTrayMenu())

  widgetWin.on('close', e => {
    e.preventDefault()
    widgetWin.hide()
    updateTrayMenu()
  })
}

// ── System tray ──────────────────────────────────────────────────
function createTray() {
  const img = nativeImage.createFromPath(path.join(__dirname, 'icon.ico'))
  tray = new Tray(img.resize({ width: 16, height: 16 }))
  tray.setToolTip('easy to-task')
  tray.on('click', () => {
    if (mainWin.isVisible()) { mainWin.focus() }
    else { mainWin.show(); mainWin.focus() }
  })
  tray.on('double-click', () => { mainWin.show(); mainWin.focus() })
  updateTrayMenu()
}

function updateTrayMenu() {
  if (!tray) return
  const wVisible = widgetWin && widgetWin.isVisible()
  const mVisible = mainWin && mainWin.isVisible()
  const menu = Menu.buildFromTemplate([
    {
      label: mVisible ? 'Ocultar app' : 'Mostrar app',
      click: () => {
        if (mVisible) { mainWin.hide() }
        else { mainWin.show(); mainWin.focus() }
        updateTrayMenu()
      }
    },
    {
      label: wVisible ? 'Ocultar widget' : 'Mostrar widget',
      click: () => {
        if (wVisible) { widgetWin.hide() }
        else { widgetWin.show(); widgetWin.focus() }
        updateTrayMenu()
      }
    },
    { type: 'separator' },
    { label: 'Salir', click: () => { app.exit(0) } }
  ])
  tray.setContextMenu(menu)
}

// ── IPC handlers ─────────────────────────────────────────────────
ipcMain.on('widget-close', () => {
  widgetWin.hide()
  updateTrayMenu()
})
ipcMain.on('widget-minimize', () => {
  widgetWin.minimize()
})
ipcMain.on('show-main', () => {
  mainWin.show()
  mainWin.focus()
})
ipcMain.on('open-widget', () => {
  widgetWin.show()
  widgetWin.focus()
  updateTrayMenu()
})

// Broadcast data changes to all OTHER windows so both stay in sync
ipcMain.on('data-changed', (event) => {
  const sender = event.sender
  const targets = [mainWin, widgetWin].filter(w => w && !w.isDestroyed())
  targets.forEach(w => {
    if (w.webContents.id !== sender.id) {
      w.webContents.send('reload-data')
    }
  })
})

// ── App lifecycle ────────────────────────────────────────────────
app.whenReady().then(() => {
  createMainWindow()
  createWidgetWindow()
  createTray()
})

// Never quit automatically — only via tray "Salir"
app.on('window-all-closed', () => {})
app.on('before-quit', () => {
  // Allow actual quit
  if (mainWin) mainWin.removeAllListeners('close')
  if (widgetWin) widgetWin.removeAllListeners('close')
})
