const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  closeWidget:    () => ipcRenderer.send('widget-close'),
  minimizeWidget: () => ipcRenderer.send('widget-minimize'),
  showMainApp:    () => ipcRenderer.send('show-main'),
  openWidget:     () => ipcRenderer.send('open-widget'),
  notifyChange:   () => ipcRenderer.send('data-changed'),
  onDataChanged:  (cb) => ipcRenderer.on('reload-data', (_e) => cb()),
})
