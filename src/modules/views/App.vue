<script setup>
import { createApp, onMounted, computed, ref } from 'vue'
import ToastContainer from './Toast/ToastContainer.vue'
import ModalContainer from './Modal/ModalContainer.vue'
import LeftSidebar from './LeftSidebar/LeftSidebar.vue'
import TabBar from './TabBar/TabBar.vue'
import Editor from './Editor/Editor.vue'
import HomePage from './HomePage/HomePage.vue'
import { useLeftSidebar } from './LeftSidebar/useLeftSidebar.js'
import { useEditor } from './Editor/useEditor.js'
import { useTabBar } from './TabBar/useTabBar.js'
import { useTagFilter } from './TagFilter/useTagFilter.js'
import { useNoteList } from './NoteList/useNoteList.js'
import { useToast } from './Toast/useToast.js'
import { useModal } from './Modal/useModal.js'
import { EventTypes } from '../core/EventTypes.js'

// 立即暴露 composable 实例到 window（早于 UIManager 构造函数调用）
window.leftSidebarApi = useLeftSidebar()
window.editorApi = useEditor()
window.tabBarApi = useTabBar()
window.tagFilterApi = useTagFilter()
window.noteListApi = useNoteList()
window.toastApi = useToast()
window.modalApi = useModal()

// 新建笔记
function handleNewNote() {
  if (window.eventBus) {
    window.eventBus.emit(EventTypes.NOTE.CREATE)
  }
}

// 计算是否在首页（无激活笔记时）
const isOnHomePage = computed(() => {
  return window.editorApi?.getActiveNoteId() === null
})

// 文件夹名
const folderName = ref('CYanote')

// 窗口最大化状态
const isMaximized = ref(false)

// 初始化获取文件夹名和最大化状态
onMounted(async () => {
  try {
    const name = await window.electronAPI.getFolderName()
    if (name) {
      folderName.value = name
    }
  } catch (e) {
    console.warn('[App] 获取文件夹名失败:', e)
  }
  isMaximized.value = await window.electronAPI.isWindowMaximized()

  // 监听窗口最大化状态变化（双击标题栏等系统操作）
  window.electronAPI.onWindowMaximized((maximized) => {
    isMaximized.value = maximized
  })

  // Toast 和 Modal 使用 <Teleport> 到 body，需单独挂载
  const toastRoot = document.getElementById('vue-toast-root')
  if (toastRoot) {
    createApp(ToastContainer).mount(toastRoot)
  }

  const modalRoot = document.getElementById('vue-modal-root')
  if (modalRoot) {
    createApp(ModalContainer).mount(modalRoot)
  }

  // 绑定 UIManager 的 DOM 事件（需在 Vue 组件挂载后调用）
  if (window.uiManager?.bindAll) {
    window.uiManager.bindAll()
  }
})

// 窗口控制函数
const handleMinimize = () => window.electronAPI.minimizeWindow()
const handleMaximize = () => window.electronAPI.maximizeWindow()
const handleClose = () => window.electronAPI.closeWindow()
</script>

<template>
  <div class="app-root">
    <div class="app-container">
      <LeftSidebar class="left-sidebar" />

      <div class="resize-handle" id="resizeHandle"></div>

      <div class="main-container">
        <header class="header" @dblclick="handleMaximize">
          <div class="tab-bar-wrapper">
            <TabBar class="tab-bar" />
          </div>
          <div class="window-controls">
            <button class="window-btn minimize" @click="handleMinimize">
              <i class="fas fa-minus"></i>
            </button>
            <button class="window-btn maximize" @click="handleMaximize">
              <i :class="isMaximized ? 'far fa-clone' : 'far fa-square'"></i>
            </button>
            <button class="window-btn close" @click="handleClose">
              <i class="fas fa-times"></i>
            </button>
          </div>
        </header>

        <main class="main-content">
          <HomePage class="home-view" />
          <Editor class="notes-container" />
        </main>

        <!-- 悬浮新建笔记按钮（仅首页显示） -->
        <button v-if="isOnHomePage" class="fab-new-note" id="fabNewNote" @click="handleNewNote" title="新建笔记">
          <i class="fas fa-plus"></i>
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.app-root {
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.app-container {
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: var(--titlebar-bg);
  color: var(--titlebar-color);
  height: 35px;
  padding: 0;
  flex-shrink: 0;
  -webkit-app-region: drag;
}

.window-controls {
  display: flex;
  height: 100%;
  -webkit-app-region: no-drag;
  flex-shrink: 0;
}

.tab-bar-wrapper {
  flex: 1;
  display: flex;
  align-items: center;
  height: 100%;
  background: var(--titlebar-bg);
  padding-right: 10px;
  min-width: 0;
}

.window-btn {
  width: 46px;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  color: var(--titlebar-color);
  cursor: pointer;
  transition: background 0.15s;
}

.window-btn:hover {
  background: rgba(0, 0, 0, 0.06);
}

.window-btn.close:hover {
  background: #e53e3e;
}

.window-btn i {
  font-size: 12px;
}

.window-btn.maximize i {
  font-size: 11px;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 15px;
  height: 100%;
}

.left-sidebar {
  display: flex;
  height: 100%;
  background: var(--sidebar-content-bg);
  border-right: 1px solid var(--sidebar-content-border);
  flex-shrink: 0;
  overflow: hidden;
  transition: width 0.3s ease;
  width: 280px;
}

.left-sidebar.collapsed {
  width: 50px !important;
}

.resize-handle {
  width: 8px;
  background: transparent;
  cursor: col-resize;
  flex-shrink: 0;
  position: relative;
  margin-left: -4px;
  margin-right: -4px;
}

.resize-handle::after {
  content: '';
  position: absolute;
  top: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 0;
  height: 100%;
  background: var(--accent);
  transition: width 0.2s;
  z-index: 10;
}

.resize-handle:hover::after,
.resize-handle.resizing::after {
  width: 4px;
}

.resize-handle::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  width: 8px;
  height: 100%;
  background: transparent;
  cursor: col-resize;
}

.main-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  height: 100%;
  min-width: 0;
}

.main-content {
  flex: 1;
  position: relative;
  overflow: hidden;
  background: var(--body-bg);
}

.home-view {
  width: 100%;
  height: 100%;
  overflow-y: auto;
  scrollbar-width: none;
}

.home-view::-webkit-scrollbar {
  display: none;
}

/* 悬浮新建笔记按钮 (FAB) */
.fab-new-note {
  position: fixed;
  bottom: 30px;
  right: 30px;
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: var(--fab-bg);
  color: white;
  border: none;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(66, 153, 225, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  transition: all 0.2s ease;
  z-index: 1000;
}

.fab-new-note:hover {
  background: var(--fab-hover-bg);
  transform: scale(1.1);
  box-shadow: 0 6px 16px rgba(66, 153, 225, 0.6);
}

.fab-new-note:active {
  transform: scale(0.95);
}
</style>