/**
 * useTabBar - 标签页栏的组合式函数
 * 使用单例模式确保状态在模块级别共享
 */
import { reactive, computed } from 'vue'

// 单例状态 - 模块级别共享
const state = reactive({
  activeTabId: 'home',
  tabs: []  // {id, title}
})

export function useTabBar() {
  /**
   * 创建笔记标签页
   */
  function createNoteTab(noteData) {
    console.log('[useTabBar] createNoteTab:', noteData)
    // 检查是否已存在
    const exists = state.tabs.some(t => t.id === noteData.id)
    if (!exists) {
      state.tabs.push({
        id: noteData.id,
        title: noteData.title || '无标题',
        pageType: noteData.pageType || 'note'
      })
    }
  }

  /**
   * 切换到指定标签页
   */
  function switchToTab(tabId) {
    console.log('[useTabBar] switchToTab:', tabId, 'current:', state.activeTabId)
    state.activeTabId = tabId
  }

  /**
   * 关闭指定标签页
   */
  function closeNoteTab(noteId) {
    console.log('[useTabBar] closeNoteTab:', noteId)
    const index = state.tabs.findIndex(t => t.id === noteId)
    if (index !== -1) {
      state.tabs.splice(index, 1)
    }
  }

  /**
   * 更新标签页标题
   */
  function updateTabTitle(noteId, newTitle) {
    const tab = state.tabs.find(t => t.id === noteId)
    if (tab) {
      tab.title = newTitle || '无标题'
    }
  }

  /**
   * 获取当前激活的标签页ID
   */
  function getActiveTabId() {
    return state.activeTabId
  }

  /**
   * 获取当前标签页顺序
   */
  function getTabOrder() {
    return state.tabs.map(t => t.id)
  }

  /**
   * 移动标签位置
   */
  function moveTab(fromIndex, toIndex) {
    const [tab] = state.tabs.splice(fromIndex, 1)
    state.tabs.splice(toIndex, 0, tab)
  }

  // 返回计算属性确保响应式
  const activeTabId = computed(() => state.activeTabId)

  return {
    state,
    tabs: state.tabs,
    activeTabId,
    createNoteTab,
    switchToTab,
    closeNoteTab,
    updateTabTitle,
    getActiveTabId,
    getTabOrder,
    moveTab
  }
}

// 导出单例状态供外部访问
export const tabBarState = state