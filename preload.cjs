// preload.cjs
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  // ── Existing (unchanged) ─────────────────────────────────────────────────────
  testPing: () => ipcRenderer.invoke("ping"),
  storeFilePath: (name, fullPath) =>
    ipcRenderer.invoke("store-file-path", name, fullPath),
  getFilePath: (filename) => ipcRenderer.invoke("get-file-path", filename),
  runPythonUploader: (args) => ipcRenderer.invoke("run-python", args),
  stopPythonUploader: () => ipcRenderer.invoke("stop-python"),
  onPythonLog: (callback) =>
    ipcRenderer.on("python-log", (_, data) => callback(data)),
  openFileDialog: () => ipcRenderer.invoke("open-file-dialog"),
  getSignalsDir: () => ipcRenderer.invoke("get-signals-dir"),

  // ── New: platform window control ─────────────────────────────────────────────
  injectJS: (windowId, script) =>
    ipcRenderer.invoke("inject-js", { windowId, script }),
  waitForPlatformLoad: (windowId) =>
    ipcRenderer.invoke("wait-for-platform-load", windowId),
  closePlatformWindow: (windowId) =>
    ipcRenderer.invoke("close-platform-window", windowId),
});

contextBridge.exposeInMainWorld("electronEnv", {
  isElectron: true,
});
