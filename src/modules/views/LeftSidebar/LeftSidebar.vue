<script setup>
import { watch, onMounted, computed } from 'vue'
import { useLeftSidebar } from './useLeftSidebar.js'
import { EventTypes } from '../../core/EventTypes.js'
import SearchPanel from './panels/SearchPanel.vue'
import TagsPanel from './panels/TagsPanel.vue'
import ArchivePanel from './panels/ArchivePanel.vue'
import RecentPanel from './panels/RecentPanel.vue'
import TrashPanel from './panels/TrashPanel.vue'

const {
  state,
  panelData,
  currentActiveNoteId,
  switchPanel,
  setWidth,
  collapse,
  expand,
  startResize,
  endResize,
  updateSearchResults,
  setActiveSearchResult
} = useLeftSidebar()

// 配置常量
const MIN_WIDTH = 180
const COLLAPSE_THRESHOLD = 90
const MAX_WIDTH = 450

// 拖拽状态
let startX = 0
let startWidth = 280

// 当前面板
const currentPanel = computed(() => state.activePanel)

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

  if (window.eventBus) {
    window.eventBus.emit(EventTypes.SIDEBAR.PANEL_CHANGE, item.id)
  }
}

// 监听折叠状态变化，应用 CSS 类
watch(() => state.isCollapsed, (collapsed) => {
  const container = document.querySelector('.left-sidebar')
  const content = document.querySelector('.sidebar-content')
  if (container) {
    container.classList.toggle('collapsed', collapsed)
    container.classList.toggle('expanded', !collapsed)
  }
  if (content) {
    content.classList.toggle('hidden', collapsed)
  }
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
  if (window.eventBus) {
    window.eventBus.emit(EventTypes.SIDEBAR.WIDTH_CHANGE, width)
  }
}, { immediate: true })

// 处理拖拽开始
function handleResizeStart(event) {
  event.preventDefault()
  startResize()
  startX = event.clientX
  startWidth = state.isCollapsed ? 50 : state.width

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

  newWidth = Math.min(newWidth, MAX_WIDTH)

  const collapseWidth = MIN_WIDTH - COLLAPSE_THRESHOLD

  if (!state.isCollapsed) {
    if (newWidth >= MIN_WIDTH) {
      setWidth(newWidth)
    } else if (newWidth >= collapseWidth) {
      setWidth(MIN_WIDTH)
    } else {
      collapse()
    }
  } else {
    if (newWidth > collapseWidth) {
      setWidth(Math.max(newWidth, MIN_WIDTH))
      expand()
    } else {
      setWidth(newWidth)
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

  const container = document.querySelector('.left-sidebar')
  if (container) {
    container.style.transition = ''
  }
}

// 挂载后绑定拖拽事件
onMounted(() => {
  const resizeHandle = document.getElementById('resizeHandle')
  if (resizeHandle) {
    resizeHandle.addEventListener('mousedown', handleResizeStart)
  }
})
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
      <SearchPanel
        v-if="currentPanel === 'search'"
        :query="panelData.search.query"
        :results="panelData.search.results"
        :active-note-id="currentActiveNoteId"
      />
      <TagsPanel
        v-else-if="currentPanel === 'tags'"
        :tags="panelData.tags.tags"
        :tag-counts="panelData.tags.tagCounts"
        :tag-notes="panelData.tags.tagNotes"
      />
      <ArchivePanel
        v-else-if="currentPanel === 'archive'"
        :years="panelData.archive.years"
      />
      <RecentPanel
        v-else-if="currentPanel === 'recent'"
        :notes="panelData.recent.notes"
      />
      <TrashPanel
        v-else-if="currentPanel === 'trash'"
        :notes="panelData.trash.notes"
      />
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
    min-width: 0;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    background: #2d3748;
    padding: 10px;
    transition: all 0.3s ease;
}

.sidebar-content.hidden {
    display: none;
}
</style>