/**
 * IPC 处理器 - 注册所有 IPC 通信
 */
const { ipcMain } = require('electron');
const NotesManager = require('./NotesManager');
const TagsManager = require('./TagsManager');

let notesManager;
let tagsManager;

async function setupIpcHandlers() {
  notesManager = new NotesManager();
  tagsManager = new TagsManager(notesManager);

  // 等待初始化完成
  await notesManager.initialize();
  await tagsManager.initialize();

  // ===== 笔记操作 =====
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

  // ===== 回收站操作 =====
  // 获取回收站笔记
  ipcMain.handle('notes:getTrashed', async () => {
    return await notesManager.getTrashedNotes();
  });

  // 移入回收站
  ipcMain.handle('notes:moveToTrash', async (event, noteId) => {
    await notesManager.moveToTrash(noteId);
    return true;
  });

  // 从回收站恢复
  ipcMain.handle('notes:restoreFromTrash', async (event, noteId) => {
    await notesManager.restoreFromTrash(noteId);
    return true;
  });

  // 永久删除
  ipcMain.handle('notes:deletePermanently', async (event, noteId) => {
    await notesManager.deletePermanently(noteId);
    return true;
  });

  // ===== 标签操作 =====
  // 获取所有标签
  ipcMain.handle('tags:getAll', async () => {
    return await tagsManager.getAllTags();
  });

  // 创建标签
  ipcMain.handle('tags:create', async (event, name, color) => {
    return await tagsManager.createTag(name, color);
  });

  // 更新标签
  ipcMain.handle('tags:update', async (event, tagId, updates) => {
    return await tagsManager.updateTag(tagId, updates);
  });

  // 删除标签
  ipcMain.handle('tags:delete', async (event, tagId) => {
    await tagsManager.deleteTag(tagId);
    return true;
  });

  // 获取标签下的笔记
  ipcMain.handle('tags:getNotes', async (event, tagId) => {
    return await tagsManager.getNotesByTag(tagId);
  });

  // 获取标签笔记计数
  ipcMain.handle('tags:getTagCounts', async () => {
    return await tagsManager.getTagNoteCounts();
  });
}

module.exports = { setupIpcHandlers };
