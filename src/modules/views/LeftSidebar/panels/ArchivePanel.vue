<script setup>
import { ref } from 'vue'
import { EventTypes } from '../../../core/EventTypes.js'

const props = defineProps({
  years: {
    type: Array,
    default: () => []
  }
})

// 年份展开状态
const expandedYears = ref(new Set())

// 切换年份展开状态
function toggleYearExpanded(year) {
  if (expandedYears.value.has(year)) {
    expandedYears.value.delete(year)
  } else {
    expandedYears.value.add(year)
  }
  // 通知外部状态变化
  if (window.eventBus) {
    window.eventBus.emit(EventTypes.SIDEBAR.PANEL_CHANGE, 'archive')
  }
}

// 处理笔记点击
function handleNoteClick(noteId) {
  if (window.eventBus) {
    window.eventBus.emit(EventTypes.NOTE.OPEN, { id: noteId })
  }
}

// 获取月份名称
function getMonthName(month) {
  return `${month}月`
}

// HTML 转义
function escapeHtml(text) {
  const div = document.createElement('div')
  div.textContent = text
  return div.innerHTML
}

// 暴露方法
defineExpose({
  toggleYearExpanded(year) {
    toggleYearExpanded(year)
  }
})
</script>

<template>
  <div class="sidebar-panel archive-panel">
    <h3 class="panel-title">
      <i class="fas fa-archive"></i> 归档
    </h3>
    <div class="panel-content">
      <ul v-if="years.length > 0" class="archive-list">
        <li v-for="yearData in years" :key="yearData.year" class="archive-year-item">
          <div
            class="archive-year-header"
            :data-year="yearData.year"
            @click="toggleYearExpanded(yearData.year)"
          >
            <i
              class="fas archive-expand-icon"
              :class="expandedYears.has(yearData.year) ? 'fa-chevron-down' : 'fa-chevron-right'"
            ></i>
            <span class="archive-year-text">{{ yearData.year }}年</span>
            <span class="archive-year-count">{{ yearData.totalCount }}</span>
          </div>
          <ul v-if="expandedYears.has(yearData.year)" class="archive-months-list">
            <li v-for="monthData in yearData.months" :key="monthData.month" class="archive-month-item">
              <div class="archive-month-header">
                <span class="archive-month-text">{{ getMonthName(monthData.month) }}</span>
                <span class="archive-month-count">{{ monthData.notes.length }}</span>
              </div>
              <ul class="archive-notes-list">
                <li
                  v-for="note in monthData.notes"
                  :key="note.id"
                  class="archive-note-item"
                  :data-note-id="note.id"
                  @click="handleNoteClick(note.id)"
                >
                  <i class="fas fa-sticky-note"></i>
                  <span class="archive-note-title">{{ escapeHtml(note.title || '无标题') }}</span>
                </li>
              </ul>
            </li>
          </ul>
        </li>
      </ul>
      <p v-else class="panel-empty">暂无笔记</p>
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

.archive-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.archive-year-item {
  margin-bottom: 8px;
}

.archive-year-header {
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

.archive-year-header:hover {
  background: rgba(255, 255, 255, 0.05);
}

.archive-expand-icon {
  color: #718096;
  font-size: 10px;
}

.archive-year-text {
  font-weight: 500;
}

.archive-year-count {
  color: #718096;
  font-size: 12px;
  margin-left: auto;
}

.archive-months-list {
  list-style: none;
  padding: 0 0 0 20px;
  margin: 0;
}

.archive-month-item {
  margin-bottom: 8px;
}

.archive-month-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 8px;
  color: #a0aec0;
  font-size: 12px;
}

.archive-month-count {
  color: #718096;
  font-size: 11px;
}

.archive-notes-list {
  list-style: none;
  padding: 0 0 0 16px;
  margin: 0;
}

.archive-note-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 8px;
  border-radius: 4px;
  cursor: pointer;
  color: #a0aec0;
  font-size: 12px;
  transition: background-color 0.2s;
}

.archive-note-item:hover {
  background: rgba(255, 255, 255, 0.05);
  color: #e2e8f0;
}

.archive-note-item i {
  font-size: 10px;
  color: #718096;
}

.archive-note-title {
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