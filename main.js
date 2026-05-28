/**
 * Electron 主进程入口
 */
const { app, BrowserWindow, Tray, Menu, nativeImage } = require('electron');
const path = require('path');
const { setupIpcHandlers } = require('./core/handlers');

// 判断是否为开发环境
const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

// 只在开发环境启用 electron-reload
if (isDev) {
  const electronReload = require('electron-reload');
  electronReload(__dirname, {
    // electron: path.join(__dirname, 'node_modules', '.bin', 'electron')
    electron: require(`${__dirname}/node_modules/electron`) 
  });
}

let mainWindow;
let tray;

function createTray() {
  const iconPath = path.join(__dirname, 'icon.ico');
  let trayIcon;

  try {
    trayIcon = nativeImage.createFromPath(iconPath);
    if (trayIcon.isEmpty()) {
      trayIcon = nativeImage.createEmpty();
    }
  } catch (e) {
    trayIcon = nativeImage.createEmpty();
  }

  tray = new Tray(trayIcon);
  tray.setToolTip('CYanote');

  const contextMenu = Menu.buildFromTemplate([
    {
      label: '显示窗口',
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.focus();
        }
      }
    },
    { type: 'separator' },
    {
      label: '退出',
      click: () => {
        app.quit();
      }
    }
  ]);

  tray.setContextMenu(contextMenu);

  tray.on('click', () => {
    if (mainWindow) {
      if (mainWindow.isVisible()) {
        mainWindow.hide();
      } else {
        mainWindow.show();
        mainWindow.focus();
      }
    }
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    frame: false,
    icon: path.join(__dirname, 'icon.ico'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  // 根据环境加载不同的入口
  if (isDev) {
    // 开发环境：连接 Vite 开发服务器
    mainWindow.loadURL('http://localhost:5173');
    // mainWindow.webContents.openDevTools();
  } else {
    // 生产环境：加载本地文件
    mainWindow.loadFile('dist_vue/index.html');
  }

  // 监听关闭事件，最小化到托盘而不是退出
  mainWindow.on('close', (event) => {
    if (!app.isQuitting) {
      event.preventDefault();
      mainWindow.hide();
    }
  });
}

app.whenReady().then(async () => {
  // 注册 IPC 处理器
  await setupIpcHandlers();

  // 创建窗口
  createWindow();

  // 创建托盘
  createTray();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('before-quit', () => {
  app.isQuitting = true;
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
