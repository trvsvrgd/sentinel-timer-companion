const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  getGSIStatus: () => ipcRenderer.invoke('get-gsi-status'),
  restartGSIServer: () => ipcRenderer.invoke('restart-gsi-server')
});