/**
 * useNoteList - 笔记列表的组合式函数
 * 使用单例模式确保状态在模块级别共享
 */
import { reactive } from 'vue'

// 单例状态 - 模块级别共享
const state = reactive({
  notes: []
})

export function useNoteList() {
  /**
   * 更新笔记列表
   */
  function updateNotes(newNotes) {
    // 使用 splice 原地修改，保持响应式追踪
    state.notes.splice(0, state.notes.length, ...newNotes)
  }

  /**
   * 清空笔记列表
   */
  function clearNotes() {
    state.notes.splice(0, state.notes.length)
  }

  return {
    notes: state.notes,
    updateNotes,
    clearNotes
  }
}

// 导出单例状态供外部访问
export const noteListState = state