// electron.cjs (main process)
const { app, BrowserWindow, ipcMain, shell, dialog } = require("electron");
const path = require("path");
const { spawn } = require("child_process");
const os = require("os");

let currentPythonProcess = null;
let filePathStore = {};

const PLATFORM_PARTITION = "persist:platforms";

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 820,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  if (process.env.NODE_ENV === "development") {
    win.loadURL("http://localhost:5173");
  } else {
    win.loadFile(path.join(__dirname, "dist", "index.html"));
  }

  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });
}

function openPlatformWindow(url) {
  const win = new BrowserWindow({
    width: 1280,
    height: 900,
    show: false,
    webPreferences: {
      partition: PLATFORM_PARTITION,
      nodeIntegration: false,
      contextIsolation: false,
    },
  });

  win.loadURL(url);

  win.once("ready-to-show", () => {
    win.maximize();
    win.show();
  });

  return win;
}

app.whenReady().then(() => {
  createWindow();
  console.log("Preload path:", path.join(__dirname, "preload.cjs"));

  ipcMain.handle("open-file-dialog", async () => {
    const result = await dialog.showOpenDialog({
      title: "Select a video file",
      properties: ["openFile"],
      filters: [
        { name: "Videos", extensions: ["mp4", "mov", "avi", "mkv"] },
        { name: "All Files", extensions: ["*"] },
      ],
    });
    if (!result.canceled && result.filePaths.length > 0) {
      const filePath = result.filePaths[0];
      const fileName = path.basename(filePath);
      filePathStore[fileName] = filePath;
      return { name: fileName, path: filePath };
    }
    return null;
  });

  ipcMain.handle("get-signals-dir", () => {
    return path.join(os.homedir(), "sunsetuploader", "signals");
  });

  ipcMain.handle("get-file-path", (event, filename) => {
    return filePathStore[filename] || null;
  });

  ipcMain.handle("ping", () => "pong");

  ipcMain.handle("run-python", async (event, args) => {
    return new Promise((resolve, reject) => {
      const pythonScript = path.join("C:", "Projects", "PaperTigerUploader_v1", "upload.py");
      const pythonExecutable = "C:\\Python313\\python.exe";
      const python = spawn(pythonExecutable, [pythonScript, ...args], {
        windowsHide: true,
      });

      currentPythonProcess = python;
      let output = "";

      python.stdout.on("data", (data) => {
        const chunk = data.toString();
        output += chunk;
        BrowserWindow.getAllWindows().forEach((w) =>
          w.webContents.send("python-log", chunk)
        );
      });

      python.stderr.on("data", (data) => {
        BrowserWindow.getAllWindows().forEach((w) =>
          w.webContents.send("python-log", `ERR: ${data.toString()}`)
        );
      });

      python.on("close", (code) => {
        BrowserWindow.getAllWindows().forEach((w) =>
          w.webContents.send("python-log", `Python exited with code ${code}`)
        );
        currentPythonProcess = null;
        if (code === 0) resolve(output);
        else reject(output);
      });

      python.on("error", (err) => {
        BrowserWindow.getAllWindows().forEach((w) =>
          w.webContents.send("python-log", `Spawn error: ${err.message}`)
        );
        reject(err);
      });
    });
  });

  ipcMain.handle("stop-python", async () => {
    if (currentPythonProcess) {
      try {
        if (process.platform === "win32") {
          currentPythonProcess.kill();
        } else {
          currentPythonProcess.kill("SIGTERM");
        }
        currentPythonProcess = null;
        return "Stopped process";
      } catch (e) {
        return `Error stopping process: ${e.message || e}`;
      }
    }
    return "No active process";
  });

  ipcMain.handle("store-file-path", (event, name, fullPath) => {
    if (name && fullPath) {
      filePathStore[name] = fullPath;
      return true;
    }
    return false;
  });

  // ── NEW: Open a maximized BrowserWindow for TikTok/Instagram/YouTube ────────
  ipcMain.handle("open-platform-window", async (event, { platform, url }) => {
    const win = openPlatformWindow(url);
    return win.id;
  });

  // ── NEW: Inject JS into the platform window ──────────────────────────────────
  ipcMain.handle("inject-js", async (event, { windowId, script }) => {
    const win = BrowserWindow.fromId(windowId);
    if (!win) return { ok: false, error: "Window not found" };
    try {
      const result = await win.webContents.executeJavaScript(script);
      return { ok: true, result };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  });

  // ── NEW: Wait for platform window page to finish loading ─────────────────────
  ipcMain.handle("wait-for-platform-load", (event, windowId) => {
    return new Promise((resolve, reject) => {
      const win = BrowserWindow.fromId(windowId);
      if (!win) return reject("Window not found");
      const timeout = setTimeout(() => reject("Page load timeout"), 30000);
      win.webContents.once("did-finish-load", () => {
        clearTimeout(timeout);
        setTimeout(resolve, 1500);
      });
    });
  });

  // ── NEW: Close platform window ───────────────────────────────────────────────
  ipcMain.handle("close-platform-window", async (event, windowId) => {
    const win = BrowserWindow.fromId(windowId);
    if (win && !win.isDestroyed()) win.close();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
