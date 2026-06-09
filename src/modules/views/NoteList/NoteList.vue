<script setup>
import { formatDate } from '../../utils/formatters.js'
import { EventTypes } from '../../core/EventTypes.js'
import { useNoteList } from './useNoteList.js'

const { notes } = useNoteList()

// 处理笔记点击
function handleNoteClick(note) {
  if (window.eventBus) {
    window.eventBus.emit(EventTypes.NOTE.OPEN, note)
  }
}

// 处理删除按钮点击
function handleDelete(noteId, event) {
  event.stopPropagation()
  if (window.eventBus) {
    window.eventBus.emit(EventTypes.NOTE.DELETE, noteId)
  }
}

// 格式化日期
function formatNoteDate(date) {
  return formatDate(date, 'YYYY-MM-DD HH:mm')
}
</script>

<template>
  <div class="notes-grid">
    <div
      v-for="note in notes"
      :key="note.id"
      class="note-card"
      @click="handleNoteClick(note)"
    >
      <button
        class="note-delete-btn"
        :data-note-id="note.id"
        @click="handleDelete(note.id, $event)"
      >
        <i class="fas fa-trash"></i>
      </button>
      <h3>{{ note.title || '无标题' }}</h3>
      <p class="note-excerpt">{{ note.excerpt || '无摘要' }}</p>
      <div class="note-meta">
        <span>{{ formatNoteDate(note.updatedAt) }}</span>
        <span><i class="fas fa-calendar-alt"></i> 最后修改</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.notes-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
    gap: 20px;
    width: 100%;
    box-sizing: border-box;
}

.note-card {
    position: relative;
    background: var(--note-card-bg);
    border-radius: 10px;
    padding: 20px;
    cursor: pointer;
    transition: all 0.2s;
    border: 1px solid var(--note-card-border);
    box-sizing: border-box;
}

.note-card:hover {
    box-shadow: 0 4px 16px rgba(0,0,0,0.1);
    transform: translateY(-2px);
}

.note-delete-btn {
    position: absolute;
    top: 12px;
    right: 12px;
    background: none;
    border: none;
    color: var(--note-card-meta-color);
    cursor: pointer;
    padding: 4px 8px;
    border-radius: 4px;
    opacity: 0;
    transition: all 0.2s;
}

.note-card:hover .note-delete-btn {
    opacity: 1;
}

.note-delete-btn:hover {
    background: var(--tag-filter-blocked-bg);
    color: var(--tag-filter-blocked-color);
}

.note-card h3 {
    margin: 0 0 8px 0;
    font-size: 16px;
    font-weight: 600;
    color: var(--note-card-title-color);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.note-excerpt {
    margin: 0 0 12px 0;
    font-size: 13px;
    color: var(--note-card-excerpt-color);
    line-height: 1.5;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
}

.note-meta {
    display: flex;
    justify-content: space-between;
    font-size: 12px;
    color: var(--note-card-meta-color);
}
</style>