/**
 * useLeftSidebar - 左侧边栏的组合式函数
 * 使用单例模式确保状态在模块级别共享
 */
import { reactive } from 'vue'

// 配置常量
const MIN_WIDTH = 180

// 单例状态 - 模块级别共享
const state = reactive({
  activePanel: 'search',
  isCollapsed: false,
  lastActivePanel: null,
  width: 280,
  savedWidth: 280,  // 保存收起前的宽度
  isResizing: false  // 标记是否正在拖拽调整大小
})

export function useLeftSidebar() {
  /**
   * 切换到指定面板
   */
  function switchPanel(panelId) {
    // 如果点击的是当前激活的面板且内容未折叠，折叠
    if (panelId === state.activePanel && !state.isCollapsed) {
      collapse()
      return
    }

    // 如果当前是折叠状态，展开它
    if (state.isCollapsed) {
      expand()
    }

    // 恢复之前的面板或切换到新面板
    if (state.lastActivePanel) {
      state.activePanel = state.lastActivePanel
      state.lastActivePanel = null
    } else {
      state.activePanel = panelId
    }
  }

  /**
   * 切换折叠/展开状态
   */
  function toggleCollapse() {
    if (state.isCollapsed) {
      expand()
    } else {
      collapse()
    }
  }

  /**
   * 折叠侧边栏
   */
  function collapse() {
    if (!state.isCollapsed) {
      // 只保存有效宽度（避免启动时默认值 280 被错误保存）
      if (state.width >= MIN_WIDTH) {
        state.savedWidth = state.width
      }
      state.lastActivePanel = state.activePanel
      state.activePanel = null
      state.isCollapsed = true
    }
  }

  /**
   * 开始拖拽
   */
  function startResize() {
    state.isResizing = true
  }

  /**
   * 结束拖拽
   */
  function endResize() {
    state.isResizing = false
  }

  /**
   * 展开侧边栏
   * 仅处理展开逻辑：恢复 isCollapsed 和 activePanel
   * 宽度由 setWidth() 统一管理，expand 不涉及宽度逻辑
   */
  function expand() {
    state.isCollapsed = false

    // 从折叠状态展开时，恢复之前的面板
    if (state.lastActivePanel) {
      state.activePanel = state.lastActivePanel
      state.lastActivePanel = null
    }
  }

  /**
   * 获取当前折叠状态
   */
  function getIsCollapsed() {
    return state.isCollapsed
  }

  /**
   * 获取当前激活的面板 ID
   */
  function getActivePanelId() {
    return state.activePanel
  }

  /**
   * 设置宽度
   */
  function setWidth(width) {
    state.width = Math.max(width, MIN_WIDTH)
  }

  /**
   * 获取宽度
   */
  function getWidth() {
    return state.width
  }

  return {
    state,
    activePanel: state.activePanel,
    isCollapsed: state.isCollapsed,
    switchPanel,
    toggleCollapse,
    collapse,
    expand,
    startResize,
    endResize,
    getIsCollapsed,
    getActivePanelId,
    setWidth,
    getWidth
  }
}

// 导出单例状态供外部访问
export const leftSidebarState = state