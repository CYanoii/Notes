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

// 处理笔记点击
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
  <div class="sidebar-panel">
    <h3 class="panel-title">
      <i class="fas fa-history"></i> 最近文件
    </h3>
    <div class="panel-content">
      <ul v-if="displayNotes.length > 0" class="recent-notes-list">
        <li
          v-for="note in displayNotes"
          :key="note.id"
          class="recent-note-item"
          :data-note-id="note.id"
          @click="handleNoteClick(note.id)"
        >
          <i class="fas fa-sticky-note"></i>
          <span class="recent-note-title">{{ escapeHtml(note.title || '无标题') }}</span>
        </li>
      </ul>
      <p v-else class="panel-empty">暂无最近笔记</p>
    </div>
  </div>
</template>

<style scoped>
.sidebar-panel {
  padding: 0;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.panel-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 600;
  color: var(--sidebar-content-text);
  margin-bottom: 12px;
  padding: 8px 6px 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex-shrink: 0;
}

.panel-title i {
  color: var(--accent);
}

.panel-content {
  flex: 1;
  min-height: 0;
}

.recent-notes-list {
  list-style: none;
  padding: 0;
  padding-left: 8px;
  margin: 0;
}

.recent-note-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px;
  border-radius: 6px;
  cursor: pointer;
  color: var(--sidebar-content-text);
  font-size: 13px;
  transition: background-color 0.2s;
  border: 1px solid var(--sidebar-card-border);
  margin-bottom: 4px;
}

.recent-note-item:hover {
  background: var(--sidebar-card-hover-bg);
}

.recent-note-item i {
  color: var(--sidebar-content-text-muted);
  font-size: 12px;
}

.recent-note-title {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.panel-empty {
  text-align: center;
  color: var(--sidebar-content-text-muted);
  font-size: 13px;
  padding: 20px 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>