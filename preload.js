/**
 * 预加载脚本 - 在渲染进程和主进程之间建立安全桥接
 */
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // 笔记操作
  createNote: () => ipcRenderer.invoke('notes:create'),
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

  // 标签操作
  getAllTags: () => ipcRenderer.invoke('tags:getAll'),
  createTag: (name, color) => ipcRenderer.invoke('tags:create', name, color),
  updateTag: (tagId, updates) => ipcRenderer.invoke('tags:update', tagId, updates),
  deleteTag: (tagId) => ipcRenderer.invoke('tags:delete', tagId)
});
