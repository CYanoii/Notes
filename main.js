const { app, BrowserWindow, ipcMain, Menu } = require('electron');
const path = require('path');

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

// IPC处理
ipcMain.handle('create-note', () => {
  return { id: Date.now(), title: '新建笔记', content: '' };
});

ipcMain.handle('get-recent-notes', () => {
  // 这里可以连接数据库或读取文件
  return [
    { id: 1, title: '项目计划', content: '...', lastOpened: '2024-01-20 10:30' },
    { id: 2, title: '会议记录', content: '...', lastOpened: '2024-01-19 14:20' },
    { id: 3, title: '开发笔记', content: '...', lastOpened: '2024-01-18 09:15' },
    { id: 4, title: '学习资料', content: '...', lastOpened: '2024-01-17 16:45' },
    { id: 5, title: '个人日记', content: '...', lastOpened: '2024-01-16 20:10' }
  ];
});