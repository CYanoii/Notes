<script setup>
import { computed } from 'vue'
import { EventTypes } from '../../../core/EventTypes.js'
import './panels-shared.css'

const props = defineProps({
  panelId: {
    type: String,
    required: true
  },
  data: {
    type: Object,
    default: () => ({ versions: [], currentVersion: 0, isEditing: false, isTrashed: false })
  },
  activeNoteId: {
    type: String,
    default: null
  }
})

const versions = computed(() => props.data?.versions || [])
const currentVersion = computed(() => props.data?.currentVersion || 0)
const isEditing = computed(() => !!props.data?.isEditing)
const isTrashed = computed(() => !!props.data?.isTrashed)
const noteId = computed(() => props.data?.noteId || null)

// 当前正在预览的历史版本号（从版本页标签ID解析）
const previewedVersion = computed(() => {
  if (!props.activeNoteId || !noteId.value) return null
  const match = props.activeNoteId.match(/^version-(.+)-v(\d+)$/)
  if (!match) return null
  const sourceNoteId = match[1]
  const version = parseInt(match[2], 10)
  // 仅当预览的是当前面板对应笔记的版本时才高亮
  if (sourceNoteId !== noteId.value) return null
  return version
})

// 原笔记页是否正处于激活状态（非版本预览页）
const isCurrentNoteActive = computed(() => {
  return !!props.activeNoteId && props.activeNoteId === noteId.value
})
// 是否为便签页（取自当前激活笔记的 noteData.pageType）
const isSticky = computed(() => {
  const id = noteId.value
  if (!id || !window.noteService) return false
  const note = window.noteService.getOpenNoteById(id)
  return note?.pageType === 'sticky'
})

// 是否有可显示内容（用于面板空态文案判定）
const hasContent = computed(() => versions.value.length > 0 || isEditing.value)

// 格式化日期时间
function formatDateTime(isoString) {
  if (!isoString) return ''
  const date = new Date(isoString)
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// 格式化相对时间
function formatRelativeTime(isoString) {
  if (!isoString) return ''
  const date = new Date(isoString)
  const now = new Date()
  const diffMs = now - date
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return '刚刚'
  if (diffMins < 60) return `${diffMins} 分钟前`
  if (diffHours < 24) return `${diffHours} 小时前`
  if (diffDays < 30) return `${diffDays} 天前`
  return formatDateTime(isoString)
}

// 预览历史版本：打开独立只读页面
function handlePreview(version) {
  if (!noteId.value) return
  // 发布态下点击当前版本卡片，直接回到笔记本身，避免重复打开版本页
  if (!isEditing.value && version.version === currentVersion.value) {
    handleOpenCurrentNote()
    return
  }
  if (window.eventBus) {
    window.eventBus.emit(EventTypes.VERSION.OPEN, noteId.value, version.version)
  }
}

// 点击编辑中卡片：回到当前笔记的编辑/发布页
function handleOpenCurrentNote() {
  if (!noteId.value) return
  if (window.eventBus) {
    window.eventBus.emit(EventTypes.NOTE.OPEN, { id: noteId.value })
  }
}

// 回滚到指定版本
function handleRestore(version) {
  if (!noteId.value) return
  if (isTrashed.value) {
    if (window.toastApi) {
      window.toastApi.show('回收站中的笔记不能回滚版本', 'warning')
    }
    return
  }
  if (window.eventBus) {
    window.eventBus.emit(EventTypes.VERSION.ROLLBACK, noteId.value, version.version)
  }
}
</script>

<template>
  <div class="sidebar-panel versions-panel">
    <h3 class="panel-title">
      <i class="fas fa-code-branch"></i> 版本历史
    </h3>
    <div class="panel-content">
      <!-- 无激活笔记 -->
      <p v-if="!activeNoteId" class="panel-empty">请选择一个笔记查看版本历史</p>
      <!-- 便签页不支持版本管理 -->
      <p v-else-if="isSticky" class="panel-empty">便签页不支持版本管理</p>
      <!-- 激活笔记但无历史 -->
      <p v-else-if="!hasContent" class="panel-empty">暂无历史版本</p>
      <!-- 有历史 -->
      <ul v-else class="versions-list">
        <!-- 编辑态时显示当前编辑版本（未发布） -->
        <li
          v-if="isEditing"
          class="version-item editing-version"
          :class="{ active: isCurrentNoteActive }"
          @click="handleOpenCurrentNote"
        >
          <div class="version-info">
            <div class="version-header">
              <span class="version-badge">v{{ currentVersion + 1 }}</span>
              <span class="current-tag">未发布</span>
            </div>
            <div class="version-time">编辑中...</div>
          </div>
        </li>
        <li
          v-for="version in versions"
          :key="version.version"
          class="version-item"
          :class="{
            active: isCurrentNoteActive && !isEditing && version.version === currentVersion,
            previewing: previewedVersion === version.version
          }"
          @click="handlePreview(version)"
        >
          <div class="version-info">
            <div class="version-header">
              <span class="version-badge">v{{ version.version }}</span>
              <span v-if="!isEditing && version.version === currentVersion" class="current-tag">当前版本</span>
            </div>
            <div class="version-time" :title="formatDateTime(version.publishedAt)">
              {{ formatRelativeTime(version.publishedAt) }}
            </div>
            <div v-if="version.versionNote" class="version-note">
              {{ version.versionNote }}
            </div>
          </div>
          <div class="version-actions">
            <button
              class="version-action-btn restore-btn"
              :class="{ disabled: isTrashed }"
              :disabled="isTrashed"
              :title="isTrashed ? '回收站中的笔记不能回滚版本' : '回滚到此版本'"
              @click.stop="handleRestore(version)"
            >
              <i class="fas fa-undo"></i>
            </button>
          </div>
        </li>
      </ul>
    </div>
  </div>
</template>

<style scoped>
.versions-list {
  list-style: none;
  padding: 0;
  padding-left: 8px;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.version-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 10px;
  background: var(--sidebar-card-bg);
  border: 1px solid var(--sidebar-card-border);
  border-radius: 6px;
  cursor: pointer;
  transition: background-color 0.15s ease, border-color 0.15s ease;
}

.version-item:hover {
  background: var(--sidebar-card-hover-bg);
}

.version-item.active,
.version-item.previewing {
  background: var(--tag-filter-selected-bg);
  border-color: var(--tag-filter-selected-border);
}

.version-info {
  flex: 1;
  min-width: 0;
}

.version-header {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 2px;
}

.version-badge {
  display: inline-block;
  background: var(--accent);
  color: white;
  padding: 1px 6px;
  border-radius: 3px;
  font-size: 11px;
  font-weight: 600;
  flex-shrink: 0;
}

.current-tag {
  font-size: 11px;
  color: var(--accent);
  font-weight: 500;
}

.version-time {
  font-size: 12px;
  color: var(--sidebar-content-text-muted);
  margin-bottom: 2px;
}

.version-note {
  font-size: 12px;
  color: var(--sidebar-content-text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.version-actions {
  display: none;
  gap: 4px;
  margin-left: 8px;
  flex-shrink: 0;
}

.version-item:hover .version-actions {
  display: flex;
}

.version-action-btn {
  background: none;
  border: none;
  cursor: pointer;
  width: 26px;
  height: 26px;
  border-radius: 4px;
  font-size: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background-color 0.15s ease;
  color: var(--sidebar-content-text-muted);
}

.restore-btn {
  color: var(--accent);
}

.restore-btn:hover:not(.disabled) {
  background: var(--accent);
  color: white;
}

.restore-btn.disabled {
  cursor: not-allowed;
  opacity: 0.4;
}
</style>