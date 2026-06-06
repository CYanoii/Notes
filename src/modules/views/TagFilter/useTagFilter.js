/**
 * useTagFilter - 标签筛选的组合式函数
 * 使用单例模式确保状态在模块级别共享
 */
import { reactive } from 'vue'

// 单例状态 - 模块级别共享
const state = reactive({
  tags: [],
  tagStates: {},  // {tagId: 'unselected'|'selected'|'blocked'}
  tagId: 0
})

export function useTagFilter() {
  /**
   * 更新标签列表和状态
   */
  function updateTags(newTags, newTagStates = {}) {
    // 使用 splice 原地修改，保持响应式追踪
    state.tags.splice(0, state.tags.length, ...newTags)
    // 原地清理并更新状态
    for (const key in state.tagStates) {
      delete state.tagStates[key]
    }
    for (const [tagId, tagState] of Object.entries(newTagStates)) {
      state.tagStates[tagId] = tagState
    }
  }

  /**
   * 更新单个标签状态
   */
  function updateTagState(tagId, newState) {
    if (newState === 'unselected') {
      delete state.tagStates[tagId]
    } else {
      state.tagStates[tagId] = newState
    }
  }

  /**
   * 清除所有筛选状态
   */
  function clearFilter() {
    // 原地清除，保持响应式
    for (const key in state.tagStates) {
      delete state.tagStates[key]
    }
  }

  /**
   * 获取下一个状态（循环切换）
   */
  function getNextState(currentState) {
    const stateOrder = ['unselected', 'selected', 'blocked']
    const currentIndex = stateOrder.indexOf(currentState)
    const nextIndex = (currentIndex + 1) % stateOrder.length
    return stateOrder[nextIndex]
  }

  return {
    tags: state.tags,
    tagStates: state.tagStates,
    updateTags,
    updateTagState,
    clearFilter,
    getNextState
  }
}

// 导出单例状态供外部访问（如 NoteTagCoordinator）
export const tagFilterState = state