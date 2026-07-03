<script setup>
import { ref } from 'vue'
import { useTabBar } from './useTabBar.js'
import { EventTypes } from '../../core/EventTypes.js'

const { tabs, activeTabId, createNoteTab, switchToTab, closeNoteTab, updateTabTitle, moveTab, getTabOrder } = useTabBar()

const draggedTabIndex = ref(null)
const dragOverTabIndex = ref(null)

// 处理标签点击
function handleTabClick(tabId) {
  if (tabId === 'home') {
    if (window.eventBus) {
      window.eventBus.emit(EventTypes.TAB_BAR.SWITCH_HOME)
    }
  } else {
    switchToTab(tabId)
    if (window.eventBus) {
      window.eventBus.emit(EventTypes.TAB_BAR.SWITCH_TAB, tabId)
    }
  }
}

// 处理关闭按钮点击
function handleClose(event, tabId) {
  event.stopPropagation()
  closeNoteTab(tabId)
  if (window.eventBus) {
    window.eventBus.emit(EventTypes.NOTE.CLOSE, tabId)
  }
}

// 拖拽开始
function onDragStart(event, index) {
  draggedTabIndex.value = index
  event.dataTransfer.effectAllowed = 'move'
  event.dataTransfer.setData('text/plain', tabs[index]?.id)
}

// 拖拽结束
function onDragEnd(event) {
  draggedTabIndex.value = null
  dragOverTabIndex.value = null
}

// 拖拽经过
function onDragOver(event, index) {
  event.preventDefault()
  if (draggedTabIndex.value !== null && draggedTabIndex.value !== index) {
    dragOverTabIndex.value = index
  }
}

// 放置
function onDrop(event, index) {
  event.preventDefault()
  if (draggedTabIndex.value !== null && draggedTabIndex.value !== index) {
    const newOrder = [...getTabOrder()]
    const [removed] = newOrder.splice(draggedTabIndex.value, 1)
    newOrder.splice(index, 0, removed)

    // 更新本地状态
    moveTab(draggedTabIndex.value, index)

    // 通知 Controller
    if (window.eventBus) {
      window.eventBus.emit(EventTypes.TAB_BAR.ORDER_CHANGE, newOrder)
    }
  }
  draggedTabIndex.value = null
  dragOverTabIndex.value = null
}
</script>

<template>
  <div class="tab-bar">
    <!-- 固定主页标签页 -->
    <div
      class="tab"
      :class="{ active: activeTabId === 'home' }"
      data-tab-id="home"
      @click="handleTabClick('home')"
    >
      <div class="tab-icon-title">
        <i class="fas fa-home"></i>
        <span class="tab-title">首页</span>
      </div>
    </div>

    <!-- 动态笔记标签页 -->
    <div
      v-for="(tab, index) in tabs"
      :key="tab.id"
      class="tab"
      :class="{
        active: activeTabId === tab.id,
        dragging: draggedTabIndex === index,
        'drag-over': dragOverTabIndex === index
      }"
      :data-tab-id="tab.id"
      draggable="true"
      @click="handleTabClick(tab.id)"
      @dragstart="onDragStart($event, index)"
      @dragend="onDragEnd"
      @dragover="onDragOver($event, index)"
      @drop="onDrop($event, index)"
    >
      <div class="tab-icon-title">
        <i :class="tab.pageType === 'sticky' ? 'fas fa-sticky-note' : 'fas fa-file-alt'"></i>
        <span class="tab-title">{{ tab.title }}</span>
      </div>
      <span class="tab-close" @click="handleClose($event, tab.id)">
        <i class="fas fa-times"></i>
      </span>
    </div>
  </div>
</template>

<style scoped>
.tab {
    display: flex;
    align-items: center;
    padding-left: 8px;
    padding-right: 8px;
    height: 30px;
    background: var(--titlebar-bg);
    border-radius: 6px 6px 0 0;
    cursor: pointer;
    transition: all 0.2s;
    min-width: 0;
    flex-shrink: 1;
    user-select: none;
    -webkit-app-region: no-drag;
}

.tab:hover {
    background: var(--tab-hover-bg);
}

.tab.active {
    background: var(--tab-active-bg);
    color: var(--tab-active-color);
    font-weight: 500;
}

.tab.active .tab-title {
    color: var(--tab-active-color);
}

.tab.active .tab-icon-title i {
    color: var(--tab-active-icon-color);
}

.tab.dragging {
    opacity: 0.5;
    background: var(--accent-hover);
}

.tab.drag-over {
    border-left: 2px solid var(--accent);
    padding-left: 6px;
}

.tab[data-tab-id="home"] {
    cursor: default;
}

.tab-icon-title {
    display: flex;
    align-items: center;
    min-width: 0;
    flex-shrink: 1;
    transition: all 0.3s ease;
    overflow: hidden;
}

.tab-icon-title i {
    color: var(--tab-color);
}

.tab-title {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    margin-left: 6px;
    color: var(--tab-title-color);
    font-size: 12px;
}

.tab-close {
    opacity: 0.6;
    padding: 2px;
    flex-shrink: 0;
    width: 18px;
    height: 18px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    margin-left: 4px;
    -webkit-app-region: no-drag;
}

.tab-close:hover {
    opacity: 1;
    background: rgba(0,0,0,0.1);
    border-radius: 50%;
}

.tab-bar {
    display: flex;
    flex: 1;
    overflow-x: auto;
    overflow-y: hidden;
    align-items: flex-end;
    height: 100%;
    font-size: 12px;
    min-width: 0;
}
</style>