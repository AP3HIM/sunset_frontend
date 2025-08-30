const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

let filePathStore = {};

function createWindow() {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js')
    }
  });

  win.loadURL('http://localhost:5173'); // or your built index.html
}

ipcMain.handle('store-file-path', (event, name, fullPath) => {
  filePathStore[name] = fullPath;
  return true;
});

ipcMain.handle('get-file-path', (event, filename) => {
  return filePathStore[filename] || null;
});

app.whenReady().then(createWindow);
