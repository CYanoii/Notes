<script setup>
import { watch, onMounted, computed, shallowRef, ref } from 'vue'
import { useLeftSidebar } from './useLeftSidebar.js'
import { EventTypes } from '../../core/EventTypes.js'
import { getVisiblePanels, getPanel } from './panelRegistry.js'

const folderName = ref('CYanote')

onMounted(async () => {
  try {
    const name = await window.electronAPI.getFolderName()
    if (name) {
      folderName.value = name
    }
  } catch (e) {
    console.warn('[LeftSidebar] 获取文件夹名失败:', e)
  }
})

const {
  state,
  panelData,
  currentActiveNoteId,
  menuItems,
  switchPanel,
  setWidth,
  collapse,
  expand,
  startResize,
  endResize,
  updateSearchResults,
  setActiveSearchResult,
  getPanelProps
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

// 动态面板组件映射
const panelComponents = shallowRef({})

// 加载面板组件
async function loadPanelComponents() {
  const panels = getVisiblePanels()
  const components = {}

  for (const panel of panels) {
    if (panel.component) {
      try {
        const module = await panel.component()
        components[panel.id] = module.default
      } catch (e) {
        console.error(`[LeftSidebar] Failed to load panel ${panel.id}:`, e)
      }
    }
  }
  panelComponents.value = components
}

// 获取当前活动面板组件
const activePanelComponent = computed(() => {
  if (!currentPanel.value || !panelComponents.value[currentPanel.value]) {
    return null
  }
  return panelComponents.value[currentPanel.value]
})

// 获取当前面板的 props
const currentPanelProps = computed(() => {
  if (!currentPanel.value) return {}
  return {
    panelId: currentPanel.value,
    data: getPanelProps(currentPanel.value),
    activeNoteId: currentActiveNoteId.value
  }
})

// 导航菜单项 - 使用 composable 中的动态计算值
const navMenuItems = computed(() => menuItems.value)

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
  const wrapper = document.querySelector('.sidebar-wrapper')
  const content = document.querySelector('.sidebar-content')
  if (container) {
    container.classList.toggle('collapsed', collapsed)
    container.classList.toggle('expanded', !collapsed)
  }
  if (wrapper) {
    wrapper.classList.toggle('collapsed', collapsed)
    wrapper.classList.toggle('expanded', !collapsed)
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

// 挂载后加载面板组件并绑定拖拽事件
onMounted(async () => {
  await loadPanelComponents()

  const resizeHandle = document.getElementById('resizeHandle')
  if (resizeHandle) {
    resizeHandle.addEventListener('mousedown', handleResizeStart)
  }
})
</script>

<template>
  <div class="sidebar-wrapper">
    <header class="sidebar-header">
      <span class="sidebar-header-icon"></span>
      <span class="sidebar-header-title">{{ folderName }}</span>
    </header>
    <div class="sidebar-main">
      <div class="sidebar-nav">
        <!-- 导航图标 - 动态从注册表获取 -->
        <div
          v-for="item in navMenuItems"
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
        <!-- 动态面板渲染 -->
        <component
          v-if="activePanelComponent"
          :is="activePanelComponent"
          v-bind="currentPanelProps"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.sidebar-header {
    position: relative;
    display: flex;
    align-items: center;
    height: 35px;
    padding: 0 12px;
    background: var(--titlebar-bg);
    color: var(--titlebar-color);
    flex-shrink: 0;
    -webkit-app-region: drag;
}

.sidebar-header-icon {
    position: absolute;
    left: 17px;
    top: 10px;
    width: 16px;
    height: 16px;
    background: url('../../../../icon.ico') center/contain no-repeat;
    flex-shrink: 0;
}

.sidebar-header-title {
    margin-left: 40px;
    font-size: 13px;
    font-weight: 500;
    letter-spacing: 0.5px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

/* 折叠时隐藏标题 */
.sidebar-wrapper.collapsed .sidebar-header-title {
    display: none;
}

.sidebar-wrapper {
    display: flex;
    flex-direction: column;
    height: 100%;
    width: 100%;
}

.sidebar-main {
    display: flex;
    flex-direction: row;
    flex: 1;
    min-height: 0;
    overflow: hidden;
}

.sidebar-nav {
    width: 50px;
    background: var(--sidebar-nav-bg);
    border-right: 1px solid var(--sidebar-nav-border);
    display: flex;
    flex-direction: column;
    align-items: center;
    padding-top: 10px;
    padding-bottom: 10px;
    gap: 5px;
    flex-shrink: 0;
    overflow-y: auto;
}

.sidebar-content {
    flex: 1;
    min-width: 0;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    background: var(--sidebar-content-bg);
    transition: all 0.3s ease;
}

.sidebar-content.hidden {
    display: none;
}

.sidebar-wrapper.collapsed .sidebar-content,
.left-sidebar.collapsed .sidebar-content {
    display: none;
}

.sidebar-wrapper.collapsed .sidebar-header-title,
.left-sidebar.collapsed .sidebar-header-title {
    display: none;
}

.sidebar-nav-item {
    width: 40px;
    height: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 8px;
    cursor: pointer;
    color: var(--sidebar-nav-color);
    transition: all 0.2s;
}

.sidebar-nav-item:hover {
    background: var(--sidebar-nav-hover-bg);
    color: var(--sidebar-nav-hover-color);
}

.sidebar-nav-item.active {
    background: var(--sidebar-nav-active-bg);
    color: var(--sidebar-nav-active-color);
}

.sidebar-nav-bottom {
    margin-top: auto;
    margin-bottom: 10px;
}
</style>