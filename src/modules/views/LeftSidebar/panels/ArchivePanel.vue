<script setup>
import { reactive, computed } from 'vue'
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
    default: () => ({ years: [] })
  },
  activeNoteId: {
    type: String,
    default: null
  }
})

// 从 data 中提取归档相关属性
const years = computed(() => props.data?.years || [])

// 年份展开状态
const expandedYears = reactive(new Set())

// 切换年份展开状态
function toggleYearExpanded(year) {
  if (expandedYears.has(year)) {
    expandedYears.delete(year)
  } else {
    expandedYears.add(year)
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
            class="panel-item archive-year-header"
            :data-year="yearData.year"
            @click="toggleYearExpanded(yearData.year)"
          >
            <i
              class="fas"
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
                  class="panel-item panel-item-child archive-note-item"
                  :data-note-id="note.id"
                  @click="handleNoteClick(note.id)"
                >
                  <i :class="getPageIcon(note.pageType)"></i>
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
.archive-list {
  list-style: none;
  padding: 0;
  padding-left: 8px;
  margin: 0;
}

.archive-year-item {
  display: flex;
  flex-direction: column;
  margin-bottom: 0;
}

.archive-year-item i.archive-expand-icon,
.archive-year-item > i:first-child {
  font-size: 10px;
}

.archive-year-text {
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.archive-year-count {
  color: var(--sidebar-content-text-muted);
  font-size: 12px;
  margin-left: auto;
}

.archive-months-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.archive-month-item {
  margin-bottom: 0;
}

.archive-month-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 8px;
  padding-left: 20px;
  color: var(--sidebar-content-text-secondary);
  font-size: 12px;
}

.archive-month-count {
  color: var(--sidebar-content-text-muted);
  font-size: 11px;
}

.archive-notes-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.archive-note-title {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>