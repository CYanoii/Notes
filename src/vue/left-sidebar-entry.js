// src/vue/left-sidebar-entry.js
import { createApp } from 'vue'
import LeftSidebar from './components/LeftSidebar.vue'
import { useLeftSidebar, leftSidebarState } from './composables/useLeftSidebar.js'

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

// 挂载 LeftSidebar 到已有容器（.sidebar-nav）
const container = document.querySelector('.sidebar-nav')
if (container) {
  const app = createApp(LeftSidebar)
  app.mount(container)
}

console.log('[Vue] LeftSidebar 模块已加载')