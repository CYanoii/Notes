/**
 * IPC 处理器 - 注册所有 IPC 通信
 */
const { ipcMain } = require('electron');
const NotesManager = require('./manager');

let notesManager;

async function setupIpcHandlers() {
  notesManager = new NotesManager();

  // 等待初始化完成
  await notesManager.initialize();

  // 创建笔记
  ipcMain.handle('notes:create', async () => {
    return await notesManager.createNote();
  });

  // 获取所有笔记
  ipcMain.handle('notes:getAll', async () => {
    return await notesManager.getAllNotes();
  });

  // 获取最近笔记
  ipcMain.handle('notes:getRecent', async (event, limit = 10) => {
    return await notesManager.getRecentNotes(limit);
  });

  // 获取单个笔记
  ipcMain.handle('notes:get', async (event, noteId) => {
    return await notesManager.getNote(noteId);
  });

  // 更新笔记
  ipcMain.handle('notes:update', async (event, noteId, updates) => {
    return await notesManager.updateNote(noteId, updates);
  });

  // 删除笔记
  ipcMain.handle('notes:delete', async (event, noteId) => {
    await notesManager.deleteNote(noteId);
    return true;
  });

  // 搜索笔记
  ipcMain.handle('notes:search', async (event, query) => {
    return await notesManager.searchNotes(query);
  });
}

module.exports = { setupIpcHandlers };
