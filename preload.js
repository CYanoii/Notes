/**
 * 预加载脚本 - 在渲染进程和主进程之间建立安全桥接
 */
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // 配置操作
  getConfig: () => ipcRenderer.invoke('config:get'),
  setConfig: (key, value) => ipcRenderer.invoke('config:set', key, value),
  applyConfigAndReload: (key, value) => ipcRenderer.invoke('config:applyAndReload', key, value),

  // 页面状态操作
  loadPageState: () => ipcRenderer.invoke('pageState:load'),
  savePageState: (state) => ipcRenderer.invoke('pageState:save', state),

  // 文件夹选择
  selectFolder: () => ipcRenderer.invoke('dialog:selectFolder'),

  // 笔记操作
  createNote: (pageType) => ipcRenderer.invoke('notes:create', pageType),
  getNote: (noteId) => ipcRenderer.invoke('notes:get', noteId),
  getAllNotes: () => ipcRenderer.invoke('notes:getAll'),
  getRecentNotes: (limit) => ipcRenderer.invoke('notes:getRecent', limit),
  updateNote: (noteId, updates) => ipcRenderer.invoke('notes:update', noteId, updates),
  deleteNote: (noteId) => ipcRenderer.invoke('notes:delete', noteId),
  searchNotes: (query) => ipcRenderer.invoke('notes:search', query),

  // 回收站操作
  getTrashedNotes: () => ipcRenderer.invoke('notes:getTrashed'),
  moveToTrash: (noteId) => ipcRenderer.invoke('notes:moveToTrash', noteId),
  restoreFromTrash: (noteId) => ipcRenderer.invoke('notes:restoreFromTrash', noteId),
  deletePermanently: (noteId) => ipcRenderer.invoke('notes:deletePermanently', noteId),

  // 资源文件操作
  saveAsset: (noteId, fileName, fileData) => ipcRenderer.invoke('notes:saveAsset', noteId, fileName, fileData),

  // 标签操作
  getAllTags: () => ipcRenderer.invoke('tags:getAll'),
  createTag: (name, color) => ipcRenderer.invoke('tags:create', name, color),
  updateTag: (tagId, updates) => ipcRenderer.invoke('tags:update', tagId, updates),
  deleteTag: (tagId) => ipcRenderer.invoke('tags:delete', tagId),

  // 便签操作
  getStickies: (stickyPageId) => ipcRenderer.invoke('stickies:get', stickyPageId),
  createSticky: (stickyPageId, data) => ipcRenderer.invoke('stickies:create', stickyPageId, data),
  updateSticky: (stickyPageId, stickyId, updates) => ipcRenderer.invoke('stickies:update', stickyPageId, stickyId, updates),
  deleteSticky: (stickyPageId, stickyId) => ipcRenderer.invoke('stickies:delete', stickyPageId, stickyId),
  bringStickyToFront: (stickyPageId, stickyId) => ipcRenderer.invoke('stickies:bringToFront', stickyPageId, stickyId),
  archiveSticky: (stickyPageId, stickyId) => ipcRenderer.invoke('stickies:archive', stickyPageId, stickyId),
  unarchiveSticky: (stickyPageId, stickyId) => ipcRenderer.invoke('stickies:unarchive', stickyPageId, stickyId),
  getArchivedStickies: (stickyPageId) => ipcRenderer.invoke('stickies:getArchived', stickyPageId),

  // 窗口控制
  minimizeWindow: () => ipcRenderer.invoke('window:minimize'),
  maximizeWindow: () => ipcRenderer.invoke('window:maximize'),
  closeWindow: () => ipcRenderer.invoke('window:close'),
  isWindowMaximized: () => ipcRenderer.invoke('window:isMaximized'),
  setWindowTitle: (title) => ipcRenderer.invoke('window:setTitle', title),
  getFolderName: () => ipcRenderer.invoke('window:getFolderName'),
  onWindowMaximized: (callback) => {
    ipcRenderer.send('window:listenState');
    ipcRenderer.on('window:maximized', (event, isMaximized) => callback(isMaximized));
  }
});
