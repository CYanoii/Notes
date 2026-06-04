// src/vue/tag-filter-entry.js
import { createApp } from 'vue'
import TagFilter from './components/TagFilter.vue'
import { useTagFilter, tagFilterState } from './composables/useTagFilter.js'

// 先暴露全局 API（在挂载之前）
const { updateTags } = useTagFilter()
window.tagFilterApi = {
  state: tagFilterState,
  updateTags
}

// 挂载 TagFilter 到已有容器
const container = document.getElementById('tagFilterContainer')
if (container) {
  const app = createApp(TagFilter)
  app.mount('#tagFilterContainer')
}

console.log('[Vue] TagFilter 模块已加载')