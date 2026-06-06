<script setup>
import { watch, onMounted, ref, computed } from 'vue'
import { useLeftSidebar } from '../composables/useLeftSidebar.js'
import { EventTypes } from '../../modules/core/EventTypes.js'
import { SearchPanel } from '../../modules/views/components/panels/SearchPanel.js'
import { TagsPanel } from '../../modules/views/components/panels/TagsPanel.js'
import { ArchivePanel } from '../../modules/views/components/panels/ArchivePanel.js'
import { RecentPanel } from '../../modules/views/components/panels/RecentPanel.js'
import { TrashPanel } from '../../modules/views/components/panels/TrashPanel.js'

const { state, switchPanel, setWidth, collapse, expand, startResize, endResize } = useLeftSidebar()

// 配置常量
const MIN_WIDTH = 180
const COLLAPSE_THRESHOLD = 90
const MAX_WIDTH = 450

// 拖拽状态
let startX = 0
let startWidth = 280

// 内容面板实例
const panels = {
  search: new SearchPanel(),
  tags: new TagsPanel(),
  archive: new ArchivePanel(),
  recent: new RecentPanel(),
  trash: new TrashPanel()
}

// 导航菜单项
const menuItems = [
  { id: "search", icon: "fas fa-search", label: "搜索" },
  { id: "tags", icon: "fas fa-tags", label: "所有标签" },
  { id: "archive", icon: "fas fa-archive", label: "归档" },
  { id: "recent", icon: "fas fa-history", label: "最近文件" },
  { id: "trash", icon: "fas fa-trash-alt", label: "回收站" }
]

const bottomItems = [
  { id: "settings", icon: "fas fa-cog", label: "设置" }
]

// 处理导航项点击
function handleNavClick(item) {
  if (item.id === 'settings') {
    if (window.eventBus) {
      window.eventBus.emit(EventTypes.SETTINGS.OPEN)
    }
    return
  }

  switchPanel(item.id)

  // 通知 Controller 面板变化
  if (window.eventBus) {
    window.eventBus.emit(EventTypes.SIDEBAR.PANEL_CHANGE, item.id)
  }
}

// 监听折叠状态变化，应用 CSS 类
watch(() => state.isCollapsed, (collapsed) => {
  const container = document.querySelector('.left-sidebar')
  if (container) {
    container.classList.toggle('collapsed', collapsed)
    container.classList.toggle('expanded', !collapsed)
  }
  // 通知 PageStateController 保存状态
  if (window.eventBus) {
    window.eventBus.emit(EventTypes.SIDEBAR.COLLAPSE_CHANGE, collapsed)
  }
}, { immediate: true })

// 监听宽度变化，应用到容器
watch(() => state.width, (width) => {
  const container = document.querySelector('.left-sidebar')
  if (container) {
    container.style.width = `${width}px`
  }
  // 通知 PageStateController 保存状态
  if (window.eventBus) {
    window.eventBus.emit(EventTypes.SIDEBAR.WIDTH_CHANGE, width)
  }
}, { immediate: true })

// 渲染面板内容（由控制器调用，传入数据）
function renderPanelContent(panelId, data) {
  const container = document.querySelector('.sidebar-content')
  if (!container || !panelId) {
    if (container) container.innerHTML = ''
    return
  }

  const panel = panels[panelId]
  if (panel && panel.render) {
    panel.render(container, data)
  }
}

// 处理拖拽开始
function handleResizeStart(event) {
  event.preventDefault()
  startResize()
  startX = event.clientX
  startWidth = state.isCollapsed ? 50 : state.width

  // 移除过渡效果
  const container = document.querySelector('.left-sidebar')
  if (container) {
    container.style.transition = 'none'
  }

  document.addEventListener('mousemove', handleResizeMove)
  document.addEventListener('mouseup', handleResizeEnd)
  document.body.classList.add('resizing')
}

// 处理拖拽中
function handleResizeMove(event) {
  if (!state.isResizing) return

  const dx = event.clientX - startX
  let newWidth = startWidth + dx

  // 限制最大宽度
  newWidth = Math.min(newWidth, MAX_WIDTH)

  // 计算临界值
  const collapseWidth = MIN_WIDTH - COLLAPSE_THRESHOLD

  if (!state.isCollapsed) {
    if (newWidth >= MIN_WIDTH) {
      setWidth(newWidth);
    } else if (newWidth >= collapseWidth) {
      setWidth(MIN_WIDTH);
    } else {
      collapse();
    }
  } else {
    if (newWidth > collapseWidth) {
      setWidth(Math.max(newWidth, MIN_WIDTH));
      expand();
    } else {
      setWidth(newWidth);
    }
  }
}

// 处理拖拽结束
function handleResizeEnd() {
  if (!state.isResizing) return

  endResize()
  document.removeEventListener('mousemove', handleResizeMove)
  document.removeEventListener('mouseup', handleResizeEnd)
  document.body.classList.remove('resizing')

  // 恢复过渡效果
  const container = document.querySelector('.left-sidebar')
  if (container) {
    container.style.transition = ''
  }
}

// 挂载后绑定拖拽事件和初始化内容
onMounted(() => {
  const resizeHandle = document.getElementById('resizeHandle')
  if (resizeHandle) {
    resizeHandle.addEventListener('mousedown', handleResizeStart)
  }
  // 初始化内容渲染
  if (state.activePanel) {
    renderPanelContent(state.activePanel)
  }
})

// 暴露方法供外部调用
defineExpose({
  renderPanelContent,
  updateSearchResults,
  refreshSearchResultSelection,
  clearSearchResultSelection,
  setActiveSearchResult,
  toggleTagExpanded,
  toggleArchiveYearExpanded
})

// 以下方法由 UIManager 代理调用
function updateSearchResults(results, query) {
  panels.search.updateResults(document.querySelector('.sidebar-content'), results, query)
}

function refreshSearchResultSelection() {
  panels.search.refreshSelection(document.querySelector('.sidebar-content'))
}

function clearSearchResultSelection() {
  panels.search.clearSelection(document.querySelector('.sidebar-content'))
}

function setActiveSearchResult(noteId) {
  panels.search.setActiveResult(noteId)
}

function toggleTagExpanded(tagId) {
  panels.tags.toggleExpanded(tagId)
}

function toggleArchiveYearExpanded(year) {
  panels.archive.toggleYearExpanded(year)
}
</script>

<template>
  <div class="sidebar-wrapper">
    <div class="sidebar-nav">
      <!-- 导航图标 -->
      <div
        v-for="item in menuItems"
        :key="item.id"
        class="sidebar-nav-item"
        :class="{ active: state.activePanel === item.id }"
        :data-panel-id="item.id"
        :title="item.label"
        @click="handleNavClick(item)"
      >
        <i :class="item.icon"></i>
      </div>

      <!-- 底部功能按钮 -->
      <div
        v-for="item in bottomItems"
        :key="item.id"
        class="sidebar-nav-item sidebar-nav-bottom"
        :data-action-id="item.id"
        :title="item.label"
        @click="handleNavClick(item)"
      >
        <i :class="item.icon"></i>
      </div>
    </div>
    <div class="sidebar-content">
      <!-- 面板内容由 JS 渲染 -->
    </div>
  </div>
</template>

<style scoped>
.sidebar-wrapper {
    display: flex;
    height: 100%;
    width: 100%;
}

.sidebar-nav {
    width: 50px;
    height: 100%;
    background: #1a202c;
    display: flex;
    flex-direction: column;
    align-items: center;
    padding-top: 10px;
    gap: 5px;
    flex-shrink: 0;
}

.sidebar-nav-item {
    width: 40px;
    height: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 8px;
    cursor: pointer;
    color: #a0aec0;
    transition: all 0.2s;
}

.sidebar-nav-item:hover {
    background: rgba(255, 255, 255, 0.1);
    color: #e2e8f0;
}

.sidebar-nav-item.active {
    background: #4299e1;
    color: white;
}

.sidebar-nav-bottom {
    margin-top: auto;
    margin-bottom: 10px;
}

.sidebar-content {
    flex: 1;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    background: #2d3748;
}
</style>