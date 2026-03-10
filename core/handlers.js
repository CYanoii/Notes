/**
 * IPC 处理器 - 注册所有 IPC 通信
 */
const { ipcMain } = require('electron');
const NotesManager = require('./manager');

let notesManager;

function setupIpcHandlers() {
  notesManager = new NotesManager();

  // 创建笔记
  ipcMain.handle('notes:create', async () => {
    await notesManager.initialize();
    return await notesManager.createNote();
  });

  // 获取所有笔记
  ipcMain.handle('notes:getAll', async () => {
    await notesManager.initialize();
    return await notesManager.getAllNotes();
  });

  // 获取最近笔记
  ipcMain.handle('notes:getRecent', async (event, limit = 10) => {
    await notesManager.initialize();
    return await notesManager.getRecentNotes(limit);
  });

  // 获取单个笔记
  ipcMain.handle('notes:get', async (event, noteId) => {
    await notesManager.initialize();
    return await notesManager.getNote(noteId);
  });

  // 更新笔记
  ipcMain.handle('notes:update', async (event, noteId, updates) => {
    await notesManager.initialize();
    return await notesManager.updateNote(noteId, updates);
  });

  // 删除笔记
  ipcMain.handle('notes:delete', async (event, noteId) => {
    await notesManager.initialize();
    await notesManager.deleteNote(noteId);
    return true;
  });

  // 搜索笔记
  ipcMain.handle('notes:search', async (event, query) => {
    await notesManager.initialize();
    return await notesManager.searchNotes(query);
  });
}

module.exports = { setupIpcHandlers };
