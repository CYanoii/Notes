<script setup>
import { computed } from 'vue'
import { useTagFilter } from './useTagFilter.js'
import { EventTypes } from '../../core/EventTypes.js'

const { tags, tagStates, updateTagState, clearFilter, getNextState } = useTagFilter()

// 计算是否有激活的筛选
const hasActiveFilter = computed(() => {
  return Object.values(tagStates).some(state => state !== 'unselected')
})

// 获取标签状态
function getTagState(tagId) {
  return tagStates[tagId] || 'unselected'
}

// 处理标签点击 - 通过 eventBus 通知 Controller
function handleTagClick(tagId) {
  const currentState = getTagState(tagId)
  const nextState = getNextState(currentState)
  updateTagState(tagId, nextState)
  // 通过 eventBus 发出事件
  if (window.eventBus) {
    window.eventBus.emit(EventTypes.TAG_FILTER.STATE_CHANGE, tagId, nextState)
  }
}

// 处理清除筛选 - 通过 eventBus 通知 Controller
function handleClear() {
  // 通过 eventBus 发出事件，让 Controller 统一处理
  if (window.eventBus) {
    window.eventBus.emit(EventTypes.TAG_FILTER.CLEAR)
  }
}
</script>

<template>
  <div class="tag-filter-container">
    <span v-if="!tags || tags.length === 0" class="tag-filter-empty">暂无标签</span>
    <template v-else>
      <div
        v-for="tag in tags"
        :key="tag.id"
        class="tag-filter-item"
        :class="getTagState(tag.id)"
        @click="handleTagClick(tag.id)"
      >
        <span class="tag-filter-color" :style="{ backgroundColor: tag.color || '#718096' }"></span>
        <span class="tag-filter-name">{{ tag.name }}</span>
      </div>
      <div
        v-if="hasActiveFilter"
        class="tag-filter-clear"
        @click="handleClear"
      >
        <i class="fas fa-times"></i> 清除筛选
      </div>
    </template>
  </div>
</template>

<style scoped>
.tag-filter-container {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    margin-bottom: 30px;
    padding: 15px 20px;
    background: var(--tag-filter-bg);
    border-radius: 12px;
    box-shadow: 0 2px 12px rgba(0,0,0,0.06);
}

.tag-filter-empty {
    color: var(--tag-filter-empty-color);
    font-size: 13px;
    font-style: italic;
}

.tag-filter-item {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 4px 10px;
    border-radius: 16px;
    font-size: 13px;
    cursor: pointer;
    transition: all 0.2s;
    border: 2px solid transparent;
    user-select: none;
}

.tag-filter-item .tag-filter-color {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    flex-shrink: 0;
}

.tag-filter-item .tag-filter-name {
    max-width: 120px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

/* 未选中状态 */
.tag-filter-item.unselected {
    background: var(--tag-filter-item-bg);
    border-color: var(--tag-filter-item-border);
    color: var(--tag-filter-item-color);
}

.tag-filter-item.unselected:hover {
    background: var(--tag-filter-item-hover-bg);
    border-color: var(--tag-filter-item-hover-border);
}

/* 选中状态 */
.tag-filter-item.selected {
    background: var(--tag-filter-selected-bg);
    border-color: var(--tag-filter-selected-border);
    color: var(--tag-filter-selected-color);
}

.tag-filter-item.selected:hover {
    background: var(--tag-filter-selected-bg);
}

/* 屏蔽状态 */
.tag-filter-item.blocked {
    background: var(--tag-filter-blocked-bg);
    border-color: var(--tag-filter-blocked-border);
    color: var(--tag-filter-blocked-color);
    text-decoration: line-through;
    opacity: 0.8;
}

.tag-filter-item.blocked:hover {
    background: var(--tag-filter-blocked-bg);
}

/* 清除筛选按钮 */
.tag-filter-clear {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 4px 10px;
    border-radius: 16px;
    font-size: 13px;
    cursor: pointer;
    transition: all 0.2s;
    background: var(--tag-filter-item-bg);
    border: 1px dashed var(--tag-filter-item-border);
    color: var(--text-muted);
}

.tag-filter-clear:hover {
    background: var(--tag-filter-item-hover-bg);
    border-color: var(--tag-filter-item-hover-border);
}
</style>