const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  testPing: () => ipcRenderer.invoke("ping"),
  storeFilePath: (name, fullPath) => ipcRenderer.invoke("store-file-path", name, fullPath),
  getFilePath: (filename) => ipcRenderer.invoke("get-file-path", filename),
  runPythonUploader: (args) => ipcRenderer.invoke("run-python", args),
  stopPythonUploader: () => ipcRenderer.invoke("stop-python"),
  onPythonLog: (callback) => ipcRenderer.on("python-log", (_, data) => callback(data)),
  openFileDialog: () => ipcRenderer.invoke("open-file-dialog"),
  getSignalsDir: () => ipcRenderer.invoke("get-signals-dir"),
});

// separate flag just for environment detection
contextBridge.exposeInMainWorld("electronEnv", {
  isElectron: true,
});
