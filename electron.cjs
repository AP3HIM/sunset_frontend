// electron.cjs (main process)
const { app, BrowserWindow, ipcMain, shell, dialog, screen, globalShortcut } = require("electron");
const path = require("path");
const { spawn } = require("child_process");
const os = require("os");
const fs = require("fs");

let currentPythonProcess = null;
let filePathStore = {};
const PLATFORM_PARTITION = "persist:platforms";
const CALIBRATION_HOTKEY = "F9";

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
  shell.openExternal(url);
  return null;
}

app.whenReady().then(() => {
  createWindow();
  console.log("Preload path:", path.join(__dirname, "preload.cjs"));

  function getCalibrationPath() {
    return path.join(os.homedir(), "sunsetuploader", "click_calibration.json");
  }

  function loadCalibration() {
    try {
      const raw = fs.readFileSync(getCalibrationPath(), "utf-8");
      return JSON.parse(raw);
    } catch {
      return {};
    }
  }

  function saveCalibrationPoint(platformKey, action, x, y) {
    const data = loadCalibration();
    if (!data[platformKey]) data[platformKey] = {};
    data[platformKey][action] = [x, y];
    const dir = path.dirname(getCalibrationPath());
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(getCalibrationPath(), JSON.stringify(data, null, 2));
    return data;
  }

  // Hotkey-based capture: user hovers the real target in Chrome (fully
  // visible, no window switching needed) and taps a global hotkey. This
  // works no matter which window has focus, and there's no hidden timer to
  // lose track of — the keypress IS the confirmation.
  function startCalibrationCapture(event, { platform, action, hotkey = CALIBRATION_HOTKEY }) {
    stopCalibrationCapture(); // clear any previous registration first

    const registered = globalShortcut.register(hotkey, () => {
      const pt = screen.getCursorScreenPoint();
      stopCalibrationCapture();
      const data = saveCalibrationPoint(platform, action, pt.x, pt.y);
      event.sender.send("calibration-captured", { platform, action, x: pt.x, y: pt.y, data });
    });

    if (!registered) {
      event.sender.send("calibration-error", {
        message: `Couldn't set up the ${hotkey} shortcut — something else on your system might already be using it.`,
      });
    }
  }

  function stopCalibrationCapture() {
    globalShortcut.unregisterAll();
  }

  ipcMain.on("start-calibration-capture", startCalibrationCapture);
  ipcMain.on("cancel-calibration-capture", stopCalibrationCapture);
  ipcMain.handle("load-calibration", () => loadCalibration());

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
      const isDev = !app.isPackaged;

      const pythonExecutable = isDev
        ? path.join(__dirname, "python", "python.exe")
        : path.join(process.resourcesPath, "python", "python.exe");

      const pythonScript = isDev
        ? path.join(__dirname, "python", "upload.py")
        : path.join(process.resourcesPath, "python", "upload.py");

      const extensionPath = isDev
        ? path.join(__dirname, "extension")
        : path.join(process.resourcesPath, "extension");

      const python = spawn(pythonExecutable, [pythonScript, ...args], {
        windowsHide: true,
        env: { ...process.env, SUNSET_EXTENSION_PATH: extensionPath },
      });

      currentPythonProcess = python;
      let output = "";

      python.stdout.on("data", (data) => {
        const chunk = data.toString();
        output += chunk;
        BrowserWindow.getAllWindows().forEach((w) => w.webContents.send("python-log", chunk));
      });

      python.stderr.on("data", (data) => {
        BrowserWindow.getAllWindows().forEach((w) => w.webContents.send("python-log", `ERR: ${data.toString()}`));
      });

      python.on("close", (code) => {
        BrowserWindow.getAllWindows().forEach((w) => w.webContents.send("python-log", `Python exited with code ${code}`));
        currentPythonProcess = null;
        if (code === 0) resolve(output);
        else reject(output);
      });

      python.on("error", (err) => {
        BrowserWindow.getAllWindows().forEach((w) => w.webContents.send("python-log", `Spawn error: ${err.message}`));
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

  ipcMain.handle("open-platform-window", async (event, { platform, url }) => {
    const win = openPlatformWindow(url);
    return win.id;
  });

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

  ipcMain.handle("close-platform-window", async (event, windowId) => {
    const win = BrowserWindow.fromId(windowId);
    if (win && !win.isDestroyed()) win.close();
  });
});

// Always release the global hotkey when the app quits — an unreleased
// global shortcut can interfere with other apps on the system.
app.on("will-quit", () => {
  globalShortcut.unregisterAll();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});