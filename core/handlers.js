/**
 * IPC 处理器 - 注册所有 IPC 通信
 */
const { ipcMain, dialog } = require('electron');
const NotesManager = require('./NotesManager');
const TagsManager = require('./TagsManager');
const ConfigManager = require('./ConfigManager');

let notesManager;
let tagsManager;
let configManager;

async function setupIpcHandlers() {
  // 初始化配置管理器
  configManager = new ConfigManager();
  await configManager.initialize();

  // 获取数据根目录并初始化数据管理器
  const dataRootPath = configManager.getDataRootPath();

  notesManager = new NotesManager(dataRootPath);
  tagsManager = new TagsManager(dataRootPath);

  await notesManager.initialize();
  await tagsManager.initialize();

  // ===== 配置操作 =====
  ipcMain.handle('config:get', async () => {
    return configManager.getAll();
  });

  ipcMain.handle('config:set', async (event, key, value) => {
    await configManager.set(key, value);
    return true;
  });

  // 应用配置并重新加载数据管理器
  ipcMain.handle('config:applyAndReload', async (event, key, value) => {
    // 更新配置
    await configManager.set(key, value);

    // 重新初始化数据管理器
    const newDataRootPath = configManager.getDataRootPath();

    // 重新创建管理器实例
    notesManager = new NotesManager(newDataRootPath);
    tagsManager = new TagsManager(newDataRootPath);

    // 等待初始化完成
    await notesManager.initialize();
    await tagsManager.initialize();

    return true;
  });

  // ===== 文件夹选择对话框 =====
  ipcMain.handle('dialog:selectFolder', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory']
    });
    if (result.canceled) {
      return null;
    }
    return result.filePaths[0];
  });

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

}

module.exports = { setupIpcHandlers };