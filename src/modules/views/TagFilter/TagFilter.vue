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
    background: white;
    border-radius: 12px;
    box-shadow: 0 2px 12px rgba(0,0,0,0.06);
}

.tag-filter-empty {
    color: #a0aec0;
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
    background: #f7fafc;
    border-color: #e2e8f0;
    color: #4a5568;
}

.tag-filter-item.unselected:hover {
    background: #edf2f7;
    border-color: #cbd5e0;
}

/* 选中状态 */
.tag-filter-item.selected {
    background: #ebf8ff;
    border-color: #4299e1;
    color: #2d3748;
}

.tag-filter-item.selected:hover {
    background: #e6f3ff;
}

/* 屏蔽状态 */
.tag-filter-item.blocked {
    background: #fff5f5;
    border-color: #fc8181;
    color: #c53030;
    text-decoration: line-through;
    opacity: 0.8;
}

.tag-filter-item.blocked:hover {
    background: #fed7d7;
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
    background: #f7fafc;
    border: 1px dashed #cbd5e0;
    color: #718096;
}

.tag-filter-clear:hover {
    background: #edf2f7;
    border-color: #a0aec0;
}
</style>