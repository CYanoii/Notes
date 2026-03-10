/**
 * Electron 主进程入口
 */
const { app, BrowserWindow } = require('electron');
const path = require('path');
const { setupIpcHandlers } = require('./core/handlers');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  mainWindow.loadFile('src/index.html');

  // 开发工具
  // mainWindow.webContents.openDevTools();
}

app.whenReady().then(() => {
  // 注册 IPC 处理器
  setupIpcHandlers();

  // 创建窗口
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
