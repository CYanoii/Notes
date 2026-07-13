<script setup>
import { ref, watch } from 'vue'

const props = defineProps({
  visible: { type: Boolean, default: false },
  stickyPageId: { type: String, required: true }
})

const emit = defineEmits(['close', 'unarchive'])

// 归档便签列表
const archivedStickies = ref([])

// 当前悬停的便签ID
const hoveredStickyId = ref(null)

// 当前悬停的便签数据
const hoveredSticky = ref(null)

// 悬停条目位置
const hoveredEntryRect = ref(null)

// 列表容器的 ref
const listRef = ref(null)

// 监听 visible 变化加载数据
watch(() => props.visible, (val) => {
  if (val) {
    loadArchivedStickies()
  } else {
    // 关闭时清空悬停状态
    hoveredStickyId.value = null
    hoveredSticky.value = null
    hoveredEntryRect.value = null
  }
})

// 加载归档便签
async function loadArchivedStickies() {
  if (props.stickyPageId) {
    const data = await window.stickyController.getArchivedStickies(props.stickyPageId)
    if (data) {
      archivedStickies.value = data
    }
  }
}

function handleClose() {
  emit('close')
}

function handleUnarchive(stickyId) {
  // 先从本地列表移除（乐观更新）
  archivedStickies.value = archivedStickies.value.filter(s => s.id !== stickyId)
  emit('unarchive', stickyId)
}

// 悬停时显示预览
function handleMouseEnter(sticky, event) {
  hoveredStickyId.value = sticky.id
  hoveredSticky.value = sticky
  // 获取条目位置（基于视口坐标，避免滚动影响）
  const entry = event.currentTarget
  const rect = entry.getBoundingClientRect()
  hoveredEntryRect.value = {
    top: rect.top
  }
}

function handleMouseLeave() {
  hoveredStickyId.value = null
  hoveredSticky.value = null
  hoveredEntryRect.value = null
}

// 格式化日期时间
function formatDateTime(dateStr) {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// 点击外部关闭
function handleOverlayClick(e) {
  if (e.target === e.currentTarget) {
    handleClose()
  }
}
</script>

<template>
  <Teleport to="body">
    <div v-if="visible" class="archive-dropdown-overlay" @click="handleOverlayClick">
      <div class="archive-dropdown">
        <!-- 右侧列表区 -->
        <div class="archive-list-panel">
          <div class="archive-list-header">
            <h3>归档便签</h3>
            <button class="btn-close" @click="handleClose">
              <i class="fas fa-times"></i>
            </button>
          </div>

          <!-- 悬停预览便签 -->
          <div
            v-if="hoveredSticky && hoveredEntryRect"
            class="entry-preview"
            :style="{
              top: hoveredEntryRect.top + 'px',
              right: '310px'
            }"
          >
            <div
              class="preview-sticky"
              :style="{
                backgroundColor: hoveredSticky.color || '#fff9c4'
              }"
            >
              <div class="preview-sticky-header" :style="{ backgroundColor: hoveredSticky.headerColor || '#fff176' }">
              </div>
              <div class="preview-sticky-content" contenteditable="false">
                {{ hoveredSticky.content || '空白便签' }}
              </div>
            </div>
          </div>

          <div class="archive-list" ref="listRef">
            <div v-if="archivedStickies.length === 0" class="archive-empty">
              暂无归档便签
            </div>

            <div
              v-for="sticky in archivedStickies"
              :key="sticky.id"
              class="archive-entry"
              :class="{ hovered: hoveredStickyId === sticky.id, selected: hoveredStickyId === sticky.id }"
              @mouseenter="handleMouseEnter(sticky, $event)"
              @mouseleave="handleMouseLeave"
              @click="handleUnarchive(sticky.id)"
            >
              <div class="entry-color-bar" :style="{ backgroundColor: sticky.headerColor || '#fff176' }"></div>
              <div class="entry-content">
                <div class="entry-date">{{ formatDateTime(sticky.archivedAt) }}</div>
                <div class="entry-text">{{ sticky.content || '空白便签' }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.archive-dropdown-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  z-index: 10000;
}

.archive-dropdown {
  position: absolute;
  top: 110px;
  right: 16px;
  width: 280px;
  height: 480px;
  background: var(--modal-bg);
  border: 1px solid var(--modal-border);
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
  overflow: visible;
}

/* 右侧列表区 */
.archive-list-panel {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  position: relative;
  overflow: visible;
}

.archive-list-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid var(--modal-border);
  flex-shrink: 0;
}

.archive-list-header h3 {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
}

.btn-close {
  background: transparent;
  border: none;
  cursor: pointer;
  color: var(--text-muted);
  font-size: 14px;
  padding: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-close:hover {
  color: var(--text-primary);
}

.archive-list {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
  position: relative;
}

.archive-empty {
  text-align: center;
  color: var(--text-muted);
  padding: 40px 20px;
  font-size: 13px;
}

/* 便签条目 */
.archive-entry {
  display: flex;
  align-items: center;
  padding: 8px 10px;
  border-radius: 8px;
  cursor: pointer;
  transition: background-color 0.15s;
  position: relative;
  z-index: 2;
  background: var(--modal-bg);
}

.archive-entry:hover,
.archive-entry.hovered {
  background: var(--bg-hover);
}

.archive-entry.selected {
  background: #e0e0e0;
}

.entry-color-bar {
  width: 4px;
  height: 36px;
  border-radius: 2px;
  margin-right: 12px;
  flex-shrink: 0;
}

.entry-content {
  flex: 1;
  min-width: 0;
}

.entry-date {
  font-size: 11px;
  color: var(--text-muted);
  margin-bottom: 2px;
}

.entry-text {
  font-size: 13px;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* 悬停预览便签 */
.entry-preview {
  position: fixed;
  z-index: 10001;
  pointer-events: none;
}

.preview-sticky {
  width: 160px;
  height: 200px;
  border-radius: 10px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.preview-sticky-header {
  padding: 6px 10px;
  min-height: 24px;
  display: flex;
  justify-content: center;
  align-items: center;
}

.preview-sticky-content {
  flex: 1;
  padding: 10px 12px;
  font-size: 13px;
  color: #333;
  line-height: 1.5;
  overflow: hidden;
  word-wrap: break-word;
}
</style>
