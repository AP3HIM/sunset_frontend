// electron.cjs (main process)
const { app, BrowserWindow, ipcMain, shell, dialog } = require("electron");
const path = require("path");
const { spawn } = require("child_process");

let currentPythonProcess = null;
let filePathStore = {}; // filename -> absolute path

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

app.whenReady().then(() => {
  createWindow();
  console.log("Preload path:", path.join(__dirname, "preload.cjs"));
  // Inside app.whenReady().then(() => { ... })
  ipcMain.handle("open-file-dialog", async () => {
    const result = await dialog.showOpenDialog({
      title: "Select a video file",
      properties: ["openFile"],
      filters: [
        { name: "Videos", extensions: ["mp4", "mov", "avi", "mkv"] },
        { name: "All Files", extensions: ["*"] }
      ]
    });

    if (!result.canceled && result.filePaths.length > 0) {
      const filePath = result.filePaths[0];
      const fileName = path.basename(filePath);

      filePathStore[fileName] = filePath; // Store in your map
      return { name: fileName, path: filePath };
    }
    return null;
  });



  // Return absolute path for given name (or null)
  ipcMain.handle("get-file-path", (event, filename) => {
    return filePathStore[filename] || null;
  });

  ipcMain.handle("ping", () => "pong");

  // run-python: spawn python script and stream stdout/stderr to renderer windows
  ipcMain.handle("run-python", async (event, args) => {
    return new Promise((resolve, reject) => {
      const pythonScript = path.join("C:", "Projects", "PaperTigerUploader_v1", "upload.py");
      const pythonExecutable = "C:\\Python313\\python.exe"; // full path to python.exe
      const python = spawn(pythonExecutable, [pythonScript, ...args], { windowsHide: true });


      currentPythonProcess = python;
      let output = "";

      python.stdout.on("data", (data) => {
        const chunk = data.toString();
        output += chunk;
        BrowserWindow.getAllWindows().forEach((w) => w.webContents.send("python-log", chunk));
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
          currentPythonProcess.kill(); // default on windows
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

  // Store absolute path for given filename
  ipcMain.handle("store-file-path", (event, name, fullPath) => {
    if (name && fullPath) {
      filePathStore[name] = fullPath;
      return true;
    }
    return false;
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
