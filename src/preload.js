"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var electron_1 = require("electron");
electron_1.contextBridge.exposeInMainWorld('electronAPI', {
    selectVault: function () { return electron_1.ipcRenderer.invoke('select-vault'); },
    readFile: function (filePath) { return electron_1.ipcRenderer.invoke('read-file', filePath); },
    writeFile: function (filePath, content) { return electron_1.ipcRenderer.invoke('write-file', filePath, content); },
    listFiles: function () { return electron_1.ipcRenderer.invoke('list-files'); },
});
