// src/vue/views/NoteList/note-list-entry.js
import { createApp } from 'vue'
import NoteList from './NoteList.vue'
import { useNoteList, noteListState } from './useNoteList.js'

// 暴露全局 API（供 NoteController/NoteTagCoordinator 调用）
const { updateNotes, clearNotes } = useNoteList()
window.noteListApi = {
  state: noteListState,
  updateNotes,
  clearNotes
}

// 挂载 NoteList 到已有容器
const container = document.getElementById('notesGrid')
if (container) {
  const app = createApp(NoteList)
  app.mount(container)
}

console.log('[Vue] NoteList 模块已加载')