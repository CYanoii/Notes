<script setup>
import { reactive, computed } from 'vue'
import { EventTypes } from '../../../core/EventTypes.js'

const props = defineProps({
  panelId: {
    type: String,
    required: true
  },
  data: {
    type: Object,
    default: () => ({ tags: [], tagCounts: {}, tagNotes: {} })
  },
  activeNoteId: {
    type: String,
    default: null
  }
})

// 从 data 中提取标签相关属性
const tags = computed(() => props.data?.tags || [])
const tagCounts = computed(() => props.data?.tagCounts || {})
const tagNotes = computed(() => props.data?.tagNotes || {})

// 标签展开状态 - 使用 reactive Set 以便 Vue 检测变化
const expandedTagsSet = reactive(new Set())

// 检查标签是否展开
function isTagExpanded(tagId) {
  return expandedTagsSet.has(tagId)
}

// 切换标签展开状态
function toggleExpanded(tagId) {
  if (expandedTagsSet.has(tagId)) {
    expandedTagsSet.delete(tagId)
  } else {
    expandedTagsSet.add(tagId)
  }
}

// 处理标签点击 - 展开/折叠
function handleTagClick(tagId) {
  toggleExpanded(tagId)
}

// 处理标签笔记点击
function handleTagNoteClick(noteId) {
  if (window.eventBus) {
    window.eventBus.emit(EventTypes.NOTE.OPEN, { id: noteId })
  }
}

// 处理新建标签
function handleAddTag(event) {
  event.stopPropagation()
  if (window.eventBus) {
    window.eventBus.emit(EventTypes.TAG.CREATE)
  }
}

// 处理编辑标签
function handleEditTag(event, tagId) {
  event.stopPropagation()
  if (window.eventBus) {
    window.eventBus.emit(EventTypes.TAG.EDIT, tagId)
  }
}

// 处理删除标签
function handleDeleteTag(event, tagId) {
  event.stopPropagation()
  if (window.eventBus) {
    window.eventBus.emit(EventTypes.TAG.DELETE, tagId)
  }
}

// HTML 转义
function escapeHtml(text) {
  const div = document.createElement('div')
  div.textContent = text
  return div.innerHTML
}

// 暴露方法
defineExpose({
  toggleExpanded(tagId) {
    toggleExpanded(tagId)
  }
})
</script>

<template>
  <div class="sidebar-panel tags-panel">
    <h3 class="panel-title">
      <span><i class="fas fa-tags"></i> 所有标签</span>
      <button class="tag-add-btn" title="新建标签" @click="handleAddTag($event)">
        <i class="fas fa-plus"></i>
      </button>
    </h3>
    <div class="panel-content">
      <ul v-if="tags.length > 0" class="tags-list">
        <template v-for="tag in tags" :key="tag.id">
          <li
            class="tag-main-item"
            :data-tag-id="tag.id"
            @click="handleTagClick(tag.id)"
          >
            <i
              class="fas"
              :class="isTagExpanded(tag.id) ? 'fa-chevron-down' : 'fa-chevron-right'"
            ></i>
            <span class="tag-color" :style="{ backgroundColor: tag.color }"></span>
            <span class="tag-name">{{ escapeHtml(tag.name) }}</span>
            <span class="tag-count">{{ tagCounts[tag.id] || 0 }}</span>
            <div class="tag-actions">
              <button
                class="tag-action-btn edit-btn"
                title="编辑"
                @click="handleEditTag($event, tag.id)"
              >
                <i class="fas fa-pencil-alt"></i>
              </button>
              <button
                class="tag-action-btn delete-btn"
                title="删除"
                @click="handleDeleteTag($event, tag.id)"
              >
                <i class="fas fa-trash"></i>
              </button>
            </div>
          </li>
          <ul v-if="isTagExpanded(tag.id) && tagNotes[tag.id]?.length > 0" class="tag-notes-list">
            <li
              v-for="note in tagNotes[tag.id]"
              :key="note.id"
              class="tag-note-item"
              :data-note-id="note.id"
              :data-tag-id="tag.id"
              @click.stop="handleTagNoteClick(note.id)"
            >
              <i class="fas fa-sticky-note"></i>
              <span class="tag-note-title">{{ escapeHtml(note.title || '无标题') }}</span>
            </li>
          </ul>
        </template>
      </ul>
      <p v-else class="panel-empty">暂无标签</p>
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
  justify-content: space-between;
  font-size: 14px;
  font-weight: 600;
  color: var(--sidebar-content-text);
  margin-bottom: 12px;
  padding: 8px 6px 0;
}

.panel-title span {
  display: flex;
  align-items: center;
  gap: 8px;
}

.panel-title i {
  color: var(--accent);
}

.tag-add-btn {
  background: transparent;
  border: none;
  color: var(--sidebar-content-text-muted);
  cursor: pointer;
  padding: 4px;
  font-size: 12px;
  transition: color 0.2s;
}

.tag-add-btn:hover {
  color: var(--accent);
}

.panel-content {
  flex: 1;
  min-height: 0;
}

.tags-list {
  list-style: none;
  padding: 0;
  padding-left: 8px;
  margin: 0;
}

.tag-main-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px;
  border-radius: 6px;
  cursor: pointer;
  transition: background-color 0.2s;
  color: var(--sidebar-content-text);
  font-size: 13px;
  border: 1px solid var(--sidebar-card-border);
  margin-bottom: 4px;
}

.tag-main-item:hover {
  background: var(--sidebar-card-hover-bg);
}

.tag-main-item i {
  color: var(--sidebar-content-text-muted);
  font-size: 10px;
  width: 12px;
}

.tag-color {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
}

.tag-name {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tag-count {
  color: var(--sidebar-content-text-muted);
  font-size: 12px;
}

.tag-actions {
  display: flex;
  gap: 4px;
  opacity: 0;
  transition: opacity 0.2s;
}

.tag-main-item:hover .tag-actions {
  opacity: 1;
}

.tag-action-btn {
  background: transparent;
  border: none;
  color: var(--sidebar-content-text-muted);
  cursor: pointer;
  padding: 4px;
  font-size: 10px;
  transition: color 0.2s;
}

.tag-action-btn:hover {
  color: var(--accent);
}

.tag-action-btn.delete-btn:hover {
  color: #e53e3e;
}

.tag-notes-list {
  list-style: none;
  padding: 0 0 0 20px;
  margin: 0;
}

.tag-note-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  border-radius: 4px;
  cursor: pointer;
  color: var(--sidebar-content-text-secondary);
  font-size: 12px;
  transition: background-color 0.2s;
  border: 1px solid var(--sidebar-card-border);
  margin-bottom: 2px;
}

.tag-note-item:hover {
  background: var(--sidebar-card-hover-bg);
  color: var(--sidebar-content-text);
}

.tag-note-item i {
  font-size: 10px;
  color: var(--sidebar-content-text-muted);
}

.tag-note-title {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.panel-empty {
  text-align: center;
  color: var(--sidebar-content-text-muted);
  font-size: 13px;
  padding: 20px 0;
}
</style>