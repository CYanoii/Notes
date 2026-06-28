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
          class="panel-item trash-note-item"
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
              <i class="fas fa-trash"></i>
            </button>
          </div>
        </li>
      </ul>
      <p v-else class="panel-empty">回收站为空</p>
    </div>
  </div>
</template>

<style scoped>
.trash-notes-list {
  list-style: none;
  padding: 0;
  padding-left: 8px;
  margin: 0;
}

.trash-note-info {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  min-width: 0;
}

.trash-note-title {
  color: var(--sidebar-content-text);
  font-size: 13px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.trash-note-actions {
  display: flex;
  gap: 4px;
  flex-shrink: 0;
  opacity: 0;
  transition: opacity 0.2s;
}

.trash-note-item:hover .trash-note-actions {
  opacity: 1;
}

.trash-action-btn {
  background: transparent;
  border: none;
  color: var(--sidebar-content-text-muted);
  cursor: pointer;
  padding: 4px;
  font-size: 10px;
  transition: color 0.2s;
}

.trash-action-btn:hover {
  color: var(--accent);
}

.restore-btn:hover {
  color: #48bb78;
}

.delete-btn:hover {
  color: #e53e3e;
}
</style>