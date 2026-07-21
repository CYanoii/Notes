<script setup>
import { formatDate } from '../../utils/formatters.js'
import { EventTypes } from '../../core/EventTypes.js'
import { useNoteList } from './useNoteList.js'
import { getPageIcon } from '../../utils/helpers.js'
import { ref } from 'vue'

const { notes } = useNoteList()

// 展开的卡片 ID
const expandedNoteId = ref(null)

// 处理笔记点击
function handleNoteClick(note) {
  // 如果当前有展开的卡片，收起并打开笔记
  if (expandedNoteId.value !== null) {
    expandedNoteId.value = null
  }
  if (window.eventBus) {
    window.eventBus.emit(EventTypes.NOTE.OPEN, note)
  }
}

// 处理右键展开
function handleContextMenu(noteId, event) {
  event.preventDefault()
  event.stopPropagation()
  // 切换展开状态
  if (expandedNoteId.value === noteId) {
    expandedNoteId.value = null
  } else {
    expandedNoteId.value = noteId
  }
}

// 点击其他区域时收起卡片
function handleClickOutside(event) {
  if (expandedNoteId.value !== null) {
    const card = event.target.closest('.note-card')
    if (!card) {
      expandedNoteId.value = null
    }
  }
}

// 处理删除按钮点击
function handleDelete(noteId, event) {
  event.stopPropagation()
  if (window.eventBus) {
    window.eventBus.emit(EventTypes.NOTE.DELETE, noteId)
  }
  // 关闭展开
  if (expandedNoteId.value === noteId) {
    expandedNoteId.value = null
  }
}

// 格式化日期
function formatNoteDate(date) {
  return formatDate(date, 'YYYY-MM-DD HH:mm')
}
</script>

<template>
  <div class="notes-grid" @click="handleClickOutside">
    <div
      v-for="note in notes"
      :key="note.id"
      class="note-card"
      :class="{ expanded: expandedNoteId === note.id }"
      @click.stop="handleNoteClick(note)"
      @contextmenu="handleContextMenu(note.id, $event)"
      @mouseleave="expandedNoteId = null"
    >
      <button
        class="note-delete-btn"
        :data-note-id="note.id"
        @click="handleDelete(note.id, $event)"
      >
        <i class="fas fa-trash"></i>
      </button>

      <div class="note-content">
        <h3 class="note-title">{{ note.title || '无标题' }}</h3>
        <p class="note-excerpt">{{ note.excerpt || '无摘要' }}</p>
        <div v-if="note.tagsData && note.tagsData.length > 0" class="note-tags">
          <span
            v-for="tag in note.tagsData"
            :key="tag.id"
            class="note-tag"
            :style="{ borderColor: tag.color }"
          >
            {{ tag.name }}
          </span>
        </div>
        <div class="note-meta">
          <span>{{ formatNoteDate(note.updatedAt) }}</span>
          <span><i class="fas fa-calendar-alt"></i> 最后修改</span>
        </div>
        <div v-if="expandedNoteId === note.id" class="note-meta-expand">
          <div class="note-meta-row">
            <span>{{ note.publishedAt ? formatNoteDate(note.publishedAt) : '未发布' }}</span>
            <span><i class="fas fa-upload"></i> 最后发布</span>
          </div>
          <div class="note-meta-row">
            <span>{{ formatNoteDate(note.createdAt) }}</span>
            <span><i class="fas fa-plus-circle"></i> 创建时间</span>
          </div>
        </div>
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

/* ---------- 卡片 ---------- */
.note-card {
    position: relative;
    height: 140px;
    overflow: visible;
    z-index: 1;
    cursor: pointer;
}

.note-card:hover {
    z-index: 1;
}

.note-card.expanded {
    z-index: 10;
}

/* ---------- 内容容器 ---------- */
.note-content {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    min-height: 140px;
    max-height: 140px;
    overflow: hidden;
    background: var(--note-card-bg);
    border: 1px solid var(--note-card-border);
    border-radius: 10px;
    padding: 20px;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    transition: max-height 0.25s ease, box-shadow 0.25s ease;
    z-index: 2;
}

.note-card:hover .note-content {
    transform: translateY(-2px);
    box-shadow: 0 4px 16px rgba(0,0,0,0.1);
}

.note-card.expanded .note-content {
    max-height: 600px;
    overflow: visible;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
    z-index: 10;
}

/* ---------- 内部元素默认（折叠） ---------- */
.note-title {
    margin: 0 0 6px 0;
    font-size: 16px;
    font-weight: 600;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.note-excerpt {
    margin: 0 0 8px 0;
    font-size: 13px;
    color: var(--note-card-excerpt-color);
    line-height: 1.5;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
    flex: 1;
}

.note-tags {
    display: none;
    flex-wrap: wrap;
    gap: 4px;
    margin-bottom: 8px;
}

.note-meta {
    display: flex;
    justify-content: space-between;
    font-size: 12px;
    color: var(--note-card-meta-color);
    flex-shrink: 0;
}

.note-meta-expand {
    margin-top: 4px;
}

.note-meta-row {
    display: flex;
    justify-content: space-between;
    font-size: 12px;
    color: var(--note-card-meta-color);
    margin-bottom: 4px;
}

.note-meta-row:last-child {
    margin-bottom: 0;
}

/* ---------- 悬停时展开 ---------- */
.note-card.expanded .note-title {
    white-space: normal;
    overflow: visible;
    text-overflow: clip;
}

.note-card.expanded .note-excerpt {
    -webkit-line-clamp: unset;
    overflow: visible;
    display: block;
}

.note-card.expanded .note-tags {
    display: flex;
}

.note-card.expanded .note-content {
    transform: translateY(-2px);
}

/* ---------- 删除按钮 ---------- */
.note-delete-btn {
    position: absolute;
    top: 12px;
    right: 12px;
    z-index: 20;
    background: none;
    border: none;
    color: var(--note-card-meta-color);
    cursor: pointer;
    padding: 4px 8px;
    border-radius: 4px;
    opacity: 0;
    transition: opacity 0.2s;
}

.note-card.expanded .note-delete-btn {
    opacity: 1;
}

.note-card:hover .note-delete-btn {
    opacity: 1;
    transform: translateY(-2px);
}

.note-delete-btn:hover {
    background: var(--tag-filter-blocked-bg);
    color: var(--tag-filter-blocked-color);
}

/* ---------- 标签样式 ---------- */
.note-tag {
    display: inline-block;
    font-size: 12px;
    padding: 1px 6px;
    border: 1px solid;
    border-radius: 10px;
    color: var(--note-card-tag-color);
    background: transparent;
    line-height: 1.4;
}
</style>
