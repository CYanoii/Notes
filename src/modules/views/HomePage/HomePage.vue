<script setup>
import { ref, computed } from 'vue'
import { EventTypes } from '../../core/EventTypes.js'
import NoteList from '../NoteList/NoteList.vue'
import TagFilter from '../TagFilter/TagFilter.vue'
import { useNoteList } from '../NoteList/useNoteList.js'

const { notes } = useNoteList()

// 搜索输入
const searchQuery = ref('')
const isSearchDisabled = computed(() => !searchQuery.value.trim())

function handleSearchInput(e) {
  searchQuery.value = e.target.value
}

function handleSearchKeypress(e) {
  if (e.key === 'Enter' && searchQuery.value.trim()) {
    window.eventBus.emit(EventTypes.SEARCH.HOME_SEARCH, searchQuery.value.trim())
  }
}

function handleSearchClick() {
  if (!isSearchDisabled.value) {
    window.eventBus.emit(EventTypes.SEARCH.HOME_SEARCH, searchQuery.value.trim())
  }
}

function handleNewNote() {
  window.eventBus.emit(EventTypes.NOTE.CREATE)
}
</script>

<template>
  <div class="home-container">
    <!-- 搜索框 -->
    <div class="search-box">
      <i class="fas fa-search"></i>
      <input
        type="text"
        id="searchInput"
        v-model="searchQuery"
        placeholder="搜索笔记内容或标题..."
        @input="handleSearchInput"
        @keypress="handleSearchKeypress"
      >
      <button
        class="btn-search"
        :class="{ disabled: isSearchDisabled }"
        :disabled="isSearchDisabled"
        @click="handleSearchClick"
      >
        <i class="fas fa-paper-plane"></i>
      </button>
    </div>

    <!-- 标签筛选栏 -->
    <TagFilter class="tag-filter-wrapper" />

    <!-- 笔记列表 -->
    <div class="all-notes">
      <h2>
        <i class="fas fa-sticky-note"></i> 所有笔记
      </h2>
      <NoteList class="notes-grid-wrapper" />
    </div>
  </div>
</template>

<style scoped>
.home-container {
  min-height: 100%;
  max-width: 900px;
  margin: 0 auto;
  padding: 40px 20px;
}

.search-box {
  display: flex;
  align-items: center;
  background: var(--search-box-bg);
  border: 1px solid var(--search-box-border);
  border-radius: 12px;
  padding: 0 20px;
  height: 60px;
  margin-bottom: 40px;
}

.search-box i {
  color: var(--text-muted);
  margin-right: 15px;
  font-size: 18px;
}

.search-box input {
  flex: 1;
  border: none;
  outline: none;
  font-size: 16px;
  color: var(--text-primary);
  background: transparent;
}

.search-box input::placeholder {
  color: var(--text-muted);
}

.btn-search {
  background: var(--accent);
  border: none;
  width: 40px;
  height: 40px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  padding: 0;
  line-height: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-search i {
  margin: 0;
  color: white;
}

.btn-search.disabled {
  background: var(--panel-border);
  cursor: not-allowed;
}

.btn-search:not(.disabled):hover {
  background: var(--accent-hover);
}

.btn-search:not(.disabled):active {
  transform: scale(0.95);
}

.all-notes h2 {
  margin-bottom: 20px;
  color: var(--home-title-color);
  font-weight: 600;
}

.all-notes h2 i {
  margin-right: 10px;
  color: var(--accent);
}
</style>