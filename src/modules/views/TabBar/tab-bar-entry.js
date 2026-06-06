// src/vue/views/TabBar/tab-bar-entry.js
import { createApp } from 'vue'
import TabBar from './TabBar.vue'
import { useTabBar, tabBarState } from './useTabBar.js'

// 暴露全局 API（供 NoteController 调用）
const { createNoteTab, switchToTab, closeNoteTab, updateTabTitle, getTabOrder } = useTabBar()
window.tabBarApi = {
  state: tabBarState,
  createNoteTab,
  switchToTab,
  closeNoteTab,
  updateTabTitle,
  getTabOrder
}

// 挂载 TabBar 到已有容器
const container = document.getElementById('tabBar')
if (container) {
  const app = createApp(TabBar)
  app.mount(container)
}

console.log('[Vue] TabBar 模块已加载')