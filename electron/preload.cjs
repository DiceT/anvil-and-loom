const { contextBridge, ipcRenderer } = require("electron");

const settingsAPI = {
  getSettings: () => ipcRenderer.invoke("settings:get"),
  updateSettings: (partial) => ipcRenderer.invoke("settings:update", partial),
  subscribe: (callback) => {
    const listener = (_event, data) => callback(data);
    ipcRenderer.on("settings:changed", listener);
    return () => ipcRenderer.removeListener("settings:changed", listener);
  },
  getAppVersion: () => ipcRenderer.invoke("app:getVersion"),
  chooseTapestriesRoot: () => ipcRenderer.invoke("tapestries:chooseRoot"),
  listTapestries: () => ipcRenderer.invoke("tapestries:list"),
  createTapestry: (name) => ipcRenderer.invoke("tapestries:create", name),
  listTapestryEntries: () => ipcRenderer.invoke("tapestries:listEntries"),
  readTapestryEntry: (relativePath) =>
    ipcRenderer.invoke("tapestries:readEntry", relativePath),
  createTapestryFolder: (payload) =>
    ipcRenderer.invoke("tapestries:createFolder", payload),
  createTapestryEntry: (payload) =>
    ipcRenderer.invoke("tapestries:createEntryFile", payload),
  renameTapestryPath: (payload) =>
    ipcRenderer.invoke("tapestries:renamePath", payload),
  deleteTapestryPath: (payload) =>
    ipcRenderer.invoke("tapestries:deletePath", payload),
  saveTapestryEntry: (payload) =>
    ipcRenderer.invoke("tapestries:saveEntry", payload),
};

contextBridge.exposeInMainWorld("settingsAPI", settingsAPI);
