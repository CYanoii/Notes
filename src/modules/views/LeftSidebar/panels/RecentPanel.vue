<script setup>
import { computed } from 'vue'
import { EventTypes } from '../../../core/EventTypes.js'

const props = defineProps({
  notes: {
    type: Array,
    default: () => []
  }
})

// 处理数组格式（直接传入数组）和对象格式（{ notes: [] }）
const displayNotes = computed(() => {
  if (Array.isArray(props.notes)) {
    return props.notes
  }
  return props.notes?.notes || []
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

.recent-notes-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.recent-note-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px;
  border-radius: 6px;
  cursor: pointer;
  color: #e2e8f0;
  font-size: 13px;
  transition: background-color 0.2s;
}

.recent-note-item:hover {
  background: rgba(255, 255, 255, 0.05);
}

.recent-note-item i {
  color: #718096;
  font-size: 12px;
}

.recent-note-title {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.panel-empty {
  text-align: center;
  color: #718096;
  font-size: 13px;
  padding: 20px 0;
}
</style>