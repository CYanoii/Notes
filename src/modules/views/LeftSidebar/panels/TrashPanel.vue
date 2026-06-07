<script setup>
import { computed } from 'vue'
import { EventTypes } from '../../../core/EventTypes.js'

const props = defineProps({
  panelId: {
    type: String,
    required: true
  },
  data: {
    type: Object,
    default: () => ({ notes: [] })
  },
  activeNoteId: {
    type: String,
    default: null
  }
})

// 从 data 中提取笔记
const notesData = computed(() => props.data?.notes || [])

// 处理数组格式（直接传入数组）和对象格式（{ notes: [] }）
const displayNotes = computed(() => {
  const notes = notesData.value
  if (Array.isArray(notes)) {
    return notes
  }
  return notes?.notes || []
})

// 处理恢复按钮点击
function handleRestore(event, noteId) {
  event.stopPropagation()
  if (window.eventBus) {
    window.eventBus.emit(EventTypes.TRASH.RESTORE, noteId)
  }
}

// 处理永久删除按钮点击
function handlePermanentDelete(event, noteId) {
  event.stopPropagation()
  if (window.eventBus) {
    window.eventBus.emit(EventTypes.TRASH.DELETE_PERMANENT, noteId)
  }
}

// 处理笔记点击（打开查看）
function handleNoteClick(noteId) {
  if (window.eventBus) {
    window.eventBus.emit(EventTypes.NOTE.OPEN, { id: noteId })
  }
}

// HTML 转义
function escapeHtml(text) {
  const div = document.createElement('div')
  div.textContent = text
  return div.innerHTML
}
</script>

<template>
  <div class="sidebar-panel trash-panel">
    <h3 class="panel-title">
      <i class="fas fa-trash-alt"></i> 回收站
    </h3>
    <div class="panel-content">
      <ul v-if="displayNotes.length > 0" class="trash-notes-list">
        <li
          v-for="note in displayNotes"
          :key="note.id"
          class="trash-note-item"
          :data-note-id="note.id"
          @click="handleNoteClick(note.id)"
        >
          <div class="trash-note-info">
            <i class="fas fa-sticky-note"></i>
            <span class="trash-note-title">{{ escapeHtml(note.title || '无标题') }}</span>
          </div>
          <div class="trash-note-actions">
            <button
              class="trash-action-btn restore-btn"
              title="恢复"
              @click="handleRestore($event, note.id)"
            >
              <i class="fas fa-undo"></i>
            </button>
            <button
              class="trash-action-btn delete-btn"
              title="永久删除"
              @click="handlePermanentDelete($event, note.id)"
            >
              <i class="fas fa-times"></i>
            </button>
          </div>
        </li>
      </ul>
      <p v-else class="panel-empty">回收站为空</p>
    </div>
  </div>
</template>

<style scoped>
.sidebar-panel {
  padding: 0;
}

.panel-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 600;
  color: #e2e8f0;
  margin-bottom: 12px;
}

.panel-title i {
  color: #4299e1;
}

.panel-content {
  display: flex;
  flex-direction: column;
}

.trash-notes-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.trash-note-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px;
  border-radius: 6px;
  cursor: pointer;
  transition: background-color 0.2s;
  margin-bottom: 8px;
}

.trash-note-item:hover {
  background: rgba(255, 255, 255, 0.05);
}

.trash-note-info {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  min-width: 0;
}

.trash-note-info i {
  color: #718096;
  font-size: 12px;
  flex-shrink: 0;
}

.trash-note-title {
  color: #e2e8f0;
  font-size: 13px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.trash-note-actions {
  display: flex;
  gap: 4px;
  flex-shrink: 0;
}

.trash-action-btn {
  background: transparent;
  border: none;
  color: #a0aec0;
  cursor: pointer;
  padding: 4px 8px;
  font-size: 12px;
  border-radius: 4px;
  transition: all 0.2s;
}

.trash-action-btn:hover {
  background: rgba(255, 255, 255, 0.1);
}

.restore-btn:hover {
  color: #48bb78;
}

.delete-btn:hover {
  color: #e53e3e;
}

.panel-empty {
  text-align: center;
  color: #718096;
  font-size: 13px;
  padding: 20px 0;
}
</style>