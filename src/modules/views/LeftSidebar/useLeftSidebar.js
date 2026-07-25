/**
 * useLeftSidebar - 左侧边栏的组合式函数
 * 使用单例模式确保状态在模块级别共享
 */
import { reactive, ref, computed } from 'vue'
import {
  getVisiblePanels,
  setVisibilityFromConfig,
  getVisibilitySettings
} from './panelRegistry.js'

// 配置常量
const MIN_WIDTH = 180

// 单例状态 - 模块级别共享
const state = reactive({
  activePanel: 'search',
  isCollapsed: false,
  lastActivePanel: null,
  width: 280,
  savedWidth: 280,
  isResizing: false
})

// 面板数据 - 移到组合式函数中以便 UIManager 访问
const panelData = reactive({
  search: { query: '', results: [] },
  tags: { tags: [], tagCounts: {}, tagNotes: {} },
  archive: { years: [] },
  recent: { notes: [] },
  outline: { headings: [], content: '' },
  versions: { versions: [], currentVersion: 0, isEditing: false, isTrashed: false, noteId: null },
  trash: { notes: [] }
})

// 当前激活的笔记ID（用于搜索结果高亮）
const currentActiveNoteId = ref(null)

// 菜单项 - 从注册表动态获取（仅可见面板）
const menuItems = computed(() => {
  return getVisiblePanels().map(panel => ({
    id: panel.id,
    icon: panel.icon,
    label: panel.label
  }))
})

export function useLeftSidebar() {
  /**
   * 切换到指定面板
   */
  function switchPanel(panelId) {
    if (panelId === state.activePanel && !state.isCollapsed) {
      collapse()
      return
    }

    if (state.isCollapsed) {
      expand()
    }

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
   */
  function expand() {
    state.isCollapsed = false

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
   * 渲染面板内容（由 UIManager 调用，传入数据）
   */
  function renderPanelContent(panelId, data) {
    if (panelId && panelData[panelId] !== undefined) {
      if (Array.isArray(data)) {
        panelData[panelId].notes = data
      } else if (data) {
        Object.assign(panelData[panelId], data)
      }
    }
  }

  /**
   * 更新搜索结果
   */
  function updateSearchResults(results, query) {
    panelData.search.results = results || []
    panelData.search.query = query || ''
  }

  /**
   * 刷新搜索结果选中状态
   */
  function refreshSearchResultSelection() {
    // 选中状态由 SearchPanel 内部管理
  }

  /**
   * 清除搜索结果选中状态
   */
  function clearSearchResultSelection() {
    // 选中状态由 SearchPanel 内部管理
  }

  /**
   * 设置当前激活的搜索结果
   */
  function setActiveSearchResult(noteId) {
    currentActiveNoteId.value = noteId
  }

  /**
   * 切换标签展开状态
   */
  function toggleTagExpanded(tagId) {
    // 由 TagsPanel 内部管理
  }

  /**
   * 切换归档年份展开状态
   */
  function toggleArchiveYearExpanded(year) {
    // 由 ArchivePanel 内部管理
  }

  /**
   * 获取面板的 props 数据
   * @param {string} panelId - 面板 ID
   * @returns {Object} 面板数据
   */
  function getPanelProps(panelId) {
    return panelData[panelId] || {}
  }

  /**
   * 从设置初始化面板可见性
   * @param {Object} config - 设置对象
   */
  function initFromConfig(config) {
    setVisibilityFromConfig(config)
    // 确保当前激活面板是可见的
    ensureActivePanelVisible()
  }

  /**
   * 确保当前激活面板是可见的，如果不可见则切换到第一个可见面板
   */
  function ensureActivePanelVisible() {
    const visiblePanels = getVisiblePanels()
    const visibleIds = visiblePanels.map(p => p.id)

    // 如果当前面板不在可见列表中，切换到第一个可见面板
    if (!visibleIds.includes(state.activePanel)) {
      if (visibleIds.length > 0) {
        state.activePanel = visibleIds[0]
      } else {
        // 没有可见面板，折叠侧边栏
        collapse()
      }
    }
  }

  /**
   * 检查面板是否可见
   * @param {string} panelId - 面板 ID
   * @returns {boolean}
   */
  function isPanelVisibleCheck(panelId) {
    const visiblePanels = getVisiblePanels()
    return visiblePanels.some(p => p.id === panelId)
  }

  return {
    state,
    panelData,
    currentActiveNoteId,
    menuItems,
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
    renderPanelContent,
    updateSearchResults,
    refreshSearchResultSelection,
    clearSearchResultSelection,
    setActiveSearchResult,
    toggleTagExpanded,
    toggleArchiveYearExpanded,
    getPanelProps,
    initFromConfig,
    ensureActivePanelVisible,
    isPanelVisibleCheck
  }
}

// 导出单例状态供外部访问
export const leftSidebarState = state