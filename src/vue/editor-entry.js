// src/vue/editor-entry.js
import { createApp } from 'vue'
import Editor from './components/Editor.vue'
import { useEditor, editorState } from './composables/useEditor.js'

const {
  createNoteEditor,
  switchToNoteEditor,
  switchToHomePage,
  closeNoteEditor,
  updateEditorTitle,
  updateEditorContent,
  updateNoteTags,
  setVditor,
  getVditor,
  setFocused,
  getActiveNoteId,
  hasEditor,
  getEditors
} = useEditor()

// 编辑器实例引用
let editorComponentRef = null

// 挂载 Editor 到已有容器
const container = document.getElementById('notesContainer')
if (container) {
  const app = createApp(Editor)
  const vm = app.mount(container)
  editorComponentRef = vm
  console.log('[Vue] Editor 模块已加载')
} else {
  console.error('[Vue] Editor 容器 #notesContainer 不存在')
}

// 暴露全局 API（供 UIManager/Controller 调用）
window.editorApi = {
  state: editorState,
  createNoteEditor,
  switchToNoteEditor,
  switchToHomePage,
  closeNoteEditor,
  updateEditorTitle,
  updateEditorContent,
  updateNoteTags,
  setVditor,
  getVditor,
  setFocused,
  getActiveNoteId,
  hasEditor,
  getEditors,
  // 设置回调函数
  setCallbacks: (onTitleChange, onExcerptChange, onContentChange) => {
    if (editorComponentRef && editorComponentRef.setCallbacks) {
      editorComponentRef.setCallbacks(onTitleChange, onExcerptChange, onContentChange)
    }
  }
}