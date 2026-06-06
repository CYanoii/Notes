// src/vue/views/LeftSidebar/left-sidebar-entry.js
import { createApp } from 'vue'
import LeftSidebar from './LeftSidebar.vue'
import { useLeftSidebar, leftSidebarState } from './useLeftSidebar.js'

// 暴露全局 API（供 UIManager/Controller 调用）
const { switchPanel, toggleCollapse, collapse, expand, startResize, endResize, getIsCollapsed, getActivePanelId, setWidth } = useLeftSidebar()
window.leftSidebarApi = {
  state: leftSidebarState,
  switchPanel,
  toggleCollapse,
  collapse,
  expand,
  startResize,
  endResize,
  getIsCollapsed,
  getActivePanelId,
  setWidth
}

// 挂载 LeftSidebar 到已有容器（#leftSidebarContainer）
const container = document.getElementById('leftSidebarContainer')
let sidebarComponent = null

if (container) {
  const app = createApp(LeftSidebar)
  sidebarComponent = app.mount(container)
  console.log('[Vue] LeftSidebar 模块已加载')
} else {
  console.error('[Vue] LeftSidebar 容器 #leftSidebarContainer 不存在')
}

// 暴露内容渲染相关方法
window.leftSidebarApi = {
  ...window.leftSidebarApi,
  // 面板内容渲染方法
  renderPanelContent: (panelId, data) => {
    if (sidebarComponent?.renderPanelContent) {
      sidebarComponent.renderPanelContent(panelId, data)
    }
  },
  updateSearchResults: (results, query) => {
    if (sidebarComponent?.updateSearchResults) {
      sidebarComponent.updateSearchResults(results, query)
    }
  },
  refreshSearchResultSelection: () => {
    if (sidebarComponent?.refreshSearchResultSelection) {
      sidebarComponent.refreshSearchResultSelection()
    }
  },
  clearSearchResultSelection: () => {
    if (sidebarComponent?.clearSearchResultSelection) {
      sidebarComponent.clearSearchResultSelection()
    }
  },
  setActiveSearchResult: (noteId) => {
    if (sidebarComponent?.setActiveSearchResult) {
      sidebarComponent.setActiveSearchResult(noteId)
    }
  },
  toggleTagExpanded: (tagId) => {
    if (sidebarComponent?.toggleTagExpanded) {
      sidebarComponent.toggleTagExpanded(tagId)
    }
  },
  toggleArchiveYearExpanded: (year) => {
    if (sidebarComponent?.toggleArchiveYearExpanded) {
      sidebarComponent.toggleArchiveYearExpanded(year)
    }
  }
}

console.log('[Vue] LeftSidebar 模块已加载')