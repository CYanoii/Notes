/**
 * useEditor - 编辑器模块的组合式函数
 * 使用单例模式确保状态在模块级别共享
 */
import { reactive, computed } from 'vue'

// 单例状态 - 模块级别共享
const state = reactive({
  activeNoteId: null,     // 当前激活的笔记ID
  editors: new Map(),     // 存储笔记编辑器实例 {noteId: {noteData, vditor}}
  isFocused: false        // 是否聚焦在编辑器内容区
})

export function useEditor() {
  /**
   * 创建笔记编辑器
   * @param {Object} noteData 笔记数据
   */
  function createNoteEditor(noteData) {
    console.log('[useEditor] createNoteEditor:', noteData)
    // 如果已存在则跳过
    if (state.editors.has(noteData.id)) {
      console.log('[useEditor] Editor already exists for note:', noteData.id)
      return
    }
    state.editors.set(noteData.id, {
      noteData,
      vditor: null
    })
  }

  /**
   * 切换到指定笔记编辑器
   * @param {string|number} noteId 笔记ID
   */
  function switchToNoteEditor(noteId) {
    console.log('[useEditor] switchToNoteEditor:', noteId)
    state.activeNoteId = noteId
  }

  /**
   * 切换到首页
   */
  function switchToHomePage() {
    console.log('[useEditor] switchToHomePage')
    state.activeNoteId = null
  }

  /**
   * 关闭笔记编辑器
   * @param {string|number} noteId 笔记ID
   */
  function closeNoteEditor(noteId) {
    console.log('[useEditor] closeNoteEditor:', noteId)
    const editor = state.editors.get(noteId)
    if (editor && editor.vditor) {
      editor.vditor.destroy()
    }
    state.editors.delete(noteId)
    if (state.activeNoteId === noteId) {
      state.activeNoteId = null
    }
  }

  /**
   * 更新编辑器标题
   * @param {string|number} noteId 笔记ID
   * @param {string} newTitle 新标题
   */
  function updateEditorTitle(noteId, newTitle) {
    const editor = state.editors.get(noteId)
    if (editor) {
      editor.noteData.title = newTitle
    }
  }

  /**
   * 更新编辑器内容
   * @param {string|number} noteId 笔记ID
   * @param {string} newContent 新内容
   */
  function updateEditorContent(noteId, newContent) {
    const editor = state.editors.get(noteId)
    if (editor && editor.vditor) {
      const currentValue = editor.vditor.getValue()
      if (currentValue !== newContent) {
        editor.vditor.setValue(newContent)
      }
    } else if (editor) {
      editor.noteData.content = newContent
    }
  }

  /**
   * 更新笔记标签显示
   * @param {string|number} noteId 笔记ID
   * @param {Array} allTags 所有标签
   * @param {Array} noteTagIds 笔记的标签ID数组
   */
  function updateNoteTags(noteId, allTags, noteTagIds) {
    const editor = state.editors.get(noteId)
    if (editor) {
      editor.noteData.tags = noteTagIds
      editor.allTags = allTags
    }
  }

  /**
   * 设置 Vditor 实例
   * @param {string|number} noteId 笔记ID
   * @param {Object} vditor Vditor 实例
   */
  function setVditor(noteId, vditor) {
    const editor = state.editors.get(noteId)
    if (editor) {
      editor.vditor = vditor
    }
  }

  /**
   * 获取 Vditor 实例
   * @param {string|number} noteId 笔记ID
   */
  function getVditor(noteId) {
    const editor = state.editors.get(noteId)
    return editor ? editor.vditor : null
  }

  /**
   * 设置聚焦状态
   * @param {boolean} focused 是否聚焦
   */
  function setFocused(focused) {
    state.isFocused = focused
  }

  /**
   * 获取当前激活的笔记ID
   */
  function getActiveNoteId() {
    return state.activeNoteId
  }

  /**
   * 检查是否存在指定笔记的编辑器
   * @param {string|number} noteId 笔记ID
   */
  function hasEditor(noteId) {
    return state.editors.has(noteId)
  }

  /**
   * 获取编辑器列表
   */
  function getEditors() {
    return Array.from(state.editors.entries()).map(([id, editor]) => ({
      id,
      noteData: editor.noteData,
      isActive: state.activeNoteId === id
    }))
  }

  // 计算属性
  const activeNoteId = computed(() => state.activeNoteId)
  const editors = computed(() => state.editors)
  const isFocused = computed(() => state.isFocused)

  return {
    state,
    activeNoteId,
    editors,
    isFocused,
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
  }
}

// 导出单例状态供外部访问
export const editorState = state