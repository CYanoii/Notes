const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  createNote: () => ipcRenderer.invoke('create-note'),
  getRecentNotes: () => ipcRenderer.invoke('get-recent-notes'),
  onNoteCreated: (callback) => ipcRenderer.on('note-created', callback)
});