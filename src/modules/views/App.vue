<script setup>
import { createApp, onMounted } from 'vue'
import ToastContainer from './Toast/ToastContainer.vue'
import ModalContainer from './Modal/ModalContainer.vue'
import TitleBar from './TitleBar/TitleBar.vue'
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

onMounted(async () => {
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
</script>

<template>
  <div class="app-root">
    <TitleBar />

    <div class="app-container">
      <LeftSidebar class="left-sidebar" />

      <div class="resize-handle" id="resizeHandle"></div>

      <div class="main-container">
        <header class="header">
          <TabBar class="tab-bar" />

          <div class="header-actions">
            <button class="btn-new-note" id="newNoteBtn" @click="handleNewNote">
              <i class="fas fa-plus"></i> 新建笔记
            </button>
          </div>
        </header>

        <main class="main-content">
          <HomePage class="home-view" />
          <Editor class="notes-container" />
        </main>
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
  top: 32px;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
}

.header {
  display: flex;
  justify-content: space-between;
  background: #2d3748;
  color: white;
  height: 35px;
  padding: 0 20px;
  box-shadow: 0 2px 10px rgba(0,0,0,0.1);
  flex-shrink: 0;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 15px;
  height: 100%;
}

.btn-new-note {
  background: #4299e1;
  color: white;
  border: none;
  padding: 5px 14px;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 500;
  transition: background 0.2s;
  font-size: 13px;
}

.btn-new-note:hover {
  background: #3182ce;
}

.btn-new-note i {
  margin-right: 5px;
}

.left-sidebar {
  display: flex;
  height: 100%;
  background: #2d3748;
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
  background: #4299e1;
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
  overflow: visible;
  background: #f5f5f5;
}

.home-view {
  width: 100%;
  min-height: 100%;
}

.notes-container {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
}
</style>