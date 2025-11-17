const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  selectVault: () => ipcRenderer.invoke('select-vault'),
  listFiles: () => ipcRenderer.invoke('list-files'),
  readFile: (file) => ipcRenderer.invoke('read-file', file),
  writeFile: (file, content) => ipcRenderer.invoke('write-file', file, content)
});