<script setup>
import { ref, computed, watch } from 'vue'
import { EventTypes } from '../../../modules/core/EventTypes.js'

const props = defineProps({
  query: {
    type: String,
    default: ''
  },
  results: {
    type: Array,
    default: () => []
  },
  activeNoteId: {
    type: String,
    default: null
  }
})

// 搜索状态
const activeSearchResultId = ref(null)
const localQuery = ref(props.query || '')

// 监听外部 activeNoteId 变化
watch(() => props.activeNoteId, (newId) => {
  if (newId) {
    activeSearchResultId.value = newId
  }
}, { immediate: true })

// 计算属性
const displayResults = computed(() => props.results || [])
const displayQuery = computed(() => props.query || localQuery.value)

// 同步外部 query 变化到本地
watch(() => props.query, (newQuery) => {
  if (newQuery !== localQuery.value) {
    localQuery.value = newQuery
  }
})

// 高亮匹配的关键词
function highlightMatch(text, query) {
  if (!query || !text) return text

  const lowerQuery = query.toLowerCase()
  const lowerText = text.toLowerCase()
  let result = ''
  let lastIndex = 0
  let index = lowerText.indexOf(lowerQuery)

  while (index !== -1) {
    result += text.slice(lastIndex, index)
    result += `<mark>${text.slice(index, index + query.length)}</mark>`
    lastIndex = index + query.length
    index = lowerText.indexOf(lowerQuery, lastIndex)
  }

  result += text.slice(lastIndex)
  return result
}

// 生成搜索预览片段
function generatePreview(content, query) {
  if (!content) return ''

  // 如果没有 query，显示内容开头
  if (!query) {
    const snippet = content.replace(/\s+/g, ' ').trim().slice(0, 80)
    if (!snippet) return ''
    return escapeHtml(snippet) + (content.length > 80 ? '...' : '')
  }

  const lowerContent = content.toLowerCase()
  const lowerQuery = query.toLowerCase()
  const index = lowerContent.indexOf(lowerQuery)

  if (index === -1) {
    const snippet = content.replace(/\s+/g, ' ').trim().slice(0, 80)
    if (!snippet) return ''
    return escapeHtml(snippet) + (content.length > 80 ? '...' : '')
  }

  const start = Math.max(0, index - 20)
  const end = Math.min(content.length, index + query.length + 60)
  let snippet = content.slice(start, end)
  snippet = snippet.replace(/\s+/g, ' ').trim()

  return highlightMatch(escapeHtml(snippet), query)
}

// HTML 转义
function escapeHtml(text) {
  const div = document.createElement('div')
  div.textContent = text
  return div.innerHTML
}

// 处理搜索输入
let debounceTimer = null
function handleSearchInput(event) {
  const value = event.target.value
  localQuery.value = value // 立即更新本地值

  clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => {
    if (window.eventBus) {
      window.eventBus.emit(EventTypes.SEARCH.SIDEBAR_SEARCH_INPUT, value.trim())
    }
  }, 200)
}

// 处理结果点击
function handleResultClick(noteId) {
  activeSearchResultId.value = noteId
  if (window.eventBus) {
    window.eventBus.emit(EventTypes.NOTE.OPEN, { id: noteId })
  }
}

// 暴露方法
defineExpose({
  setActiveResult(noteId) {
    activeSearchResultId.value = noteId
  },
  refreshSelection() {
    // 选中状态通过 activeSearchResultId 响应式处理
  },
  clearSelection() {
    activeSearchResultId.value = null
  }
})
</script>

<template>
  <div class="sidebar-panel search-panel">
    <h3 class="panel-title">
      <i class="fas fa-search"></i> 快速搜索
    </h3>
    <div class="panel-content">
      <div class="search-input-wrapper">
        <input
          type="text"
          class="sidebar-search-input"
          placeholder="输入关键词搜索..."
          v-model="localQuery"
          autocomplete="off"
          @input="handleSearchInput"
        >
        <i class="fas fa-search search-icon"></i>
      </div>
      <div class="search-results-container">
        <ul v-if="displayResults.length > 0" class="search-results-list">
          <li
            v-for="note in displayResults"
            :key="note.id"
            class="search-result-card"
            :class="{ active: activeSearchResultId === note.id }"
            :data-note-id="note.id"
            @click="handleResultClick(note.id)"
          >
            <div class="search-result-title" v-html="highlightMatch(escapeHtml(note.title || '无标题'), displayQuery)"></div>
            <div class="search-result-preview" v-html="generatePreview(note.content || '', displayQuery)"></div>
            <div v-if="note.tags && note.tagsData && note.tags.length > 0" class="search-note-tags">
              <span
                v-for="tag in note.tagsData"
                :key="tag.id"
                class="search-note-tag"
                :style="{ borderColor: tag.color }"
                v-html="highlightMatch(escapeHtml(tag.name), displayQuery)"
              ></span>
            </div>
          </li>
        </ul>
        <p v-else-if="!displayQuery" class="panel-empty">输入关键词开始搜索</p>
        <p v-else class="panel-empty">未找到匹配的笔记</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.search-panel {
  height: 100%;
  display: flex;
  flex-direction: column;
}

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
  color: #e2e8f0;
  margin-bottom: 12px;
}

.panel-title i {
  color: #4299e1;
}

.panel-content {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
}

.search-input-wrapper {
  position: relative;
  margin-bottom: 12px;
}

.sidebar-search-input {
  width: 100%;
  padding: 8px 12px 8px 32px;
  background: #4a5568;
  border: 1px solid #1a202c;
  border-radius: 4px;
  color: #e2e8f0;
  font-size: 13px;
  outline: none;
  transition: border-color 0.2s;
}

.sidebar-search-input:focus {
  border-color: #4299e1;
}

.sidebar-search-input::placeholder {
  color: #a0aec0;
}

.search-icon {
  position: absolute;
  right: 10px;
  top: 50%;
  transform: translateY(-50%);
  color: #a0aec0;
  font-size: 12px;
  pointer-events: none;
}

.search-results-container {
  flex: 1;
  overflow-y: auto;
}

.search-results-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.search-result-card {
  padding: 10px 12px;
  background: #4a5568;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
  border: 2px solid transparent;
}

.search-result-card:hover {
  background: #5a6779;
}

.search-result-card.active {
  border-color: #4299e1;
  background: #5a6779;
}

.search-result-title {
  font-size: 13px;
  font-weight: 600;
  color: #e2e8f0;
  margin-bottom: 6px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.search-result-preview {
  font-size: 12px;
  color: #a0aec0;
  line-height: 1.4;
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.search-note-tags {
  margin-top: 6px;
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.search-note-tag {
  display: inline-block;
  font-size: 10px;
  padding: 1px 6px;
  border: 1px solid;
  border-radius: 10px;
  color: #e2e8f0;
  background: rgba(255, 255, 255, 0.08);
  line-height: 1.2;
}

.panel-empty {
  text-align: center;
  color: #718096;
  font-size: 13px;
  padding: 20px 0;
}

:deep(mark) {
  background: #f6e05e;
  color: #2d3748;
  padding: 1px 3px;
  border-radius: 2px;
  font-weight: bold;
}
</style>