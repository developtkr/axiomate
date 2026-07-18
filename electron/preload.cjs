const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("axiomate", {
  openProject: () => ipcRenderer.invoke("project:open"),
  saveFile: (rootPath, relativePath, content) => ipcRenderer.invoke("project:save-file", rootPath, relativePath, content),
  compileProject: (rootPath, mainFile) => ipcRenderer.invoke("project:compile", rootPath, mainFile),
});
