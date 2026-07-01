<script setup>
import { computed } from 'vue'
import { EventTypes } from '../../../core/EventTypes.js'
import { getPageIcon } from '../../../utils/helpers.js'
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
          class="panel-item recent-note-item"
          :data-note-id="note.id"
          @click="handleNoteClick(note.id)"
        >
          <i :class="getPageIcon(note.pageType)"></i>
          <span class="recent-note-title">{{ escapeHtml(note.title || '无标题') }}</span>
        </li>
      </ul>
      <p v-else class="panel-empty">暂无最近笔记</p>
    </div>
  </div>
</template>

<style scoped>
.recent-notes-list {
  list-style: none;
  padding: 0;
  padding-left: 8px;
  margin: 0;
}

.recent-note-title {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>