<script setup>
import { ref, watch, onMounted, onUnmounted, nextTick } from 'vue'

const props = defineProps({
  visible: { type: Boolean, default: false },
  notes: { type: Array, default: () => [] },
  selectedIndex: { type: Number, default: 0 },
  searchQuery: { type: String, default: '' },
  position: { type: Object, default: () => ({ top: 0, left: 0 }) }
})

const emit = defineEmits(['update:searchQuery', 'update:selectedIndex', 'select', 'close'])

const searchInputRef = ref(null)
const listRef = ref(null)

// Focus search input when popup appears
watch(() => props.visible, (val) => {
  if (val) {
    nextTick(() => {
      searchInputRef.value?.focus()
    })
  }
})

// Scroll selected item into view
watch(() => props.selectedIndex, (idx) => {
  nextTick(() => {
    const items = listRef.value?.querySelectorAll('.suggestion-item')
    if (items && items[idx]) {
      items[idx].scrollIntoView({ block: 'nearest' })
    }
  })
})

function handleKeydown(e) {
  switch (e.key) {
    case 'ArrowDown':
      e.preventDefault()
      e.stopPropagation()
      if (props.selectedIndex < props.notes.length - 1) {
        emit('update:selectedIndex', props.selectedIndex + 1)
      }
      break
    case 'ArrowUp':
      e.preventDefault()
      e.stopPropagation()
      if (props.selectedIndex > 0) {
        emit('update:selectedIndex', props.selectedIndex - 1)
      }
      break
    case 'Enter':
      e.preventDefault()
      e.stopPropagation()
      if (props.notes.length > 0) {
        emit('select', props.notes[props.selectedIndex]?.id)
      }
      break
    case 'Escape':
      e.preventDefault()
      e.stopPropagation()
      emit('close')
      break
    case 'ArrowLeft':
      e.preventDefault()
      e.stopPropagation()
      emit('close', 'left')
      break
    case 'ArrowRight':
      e.preventDefault()
      e.stopPropagation()
      emit('close', 'right')
      break
  }
}

function handleNoteClick(noteId) {
  emit('select', noteId)
}

function handleNoteDoubleClick(noteId) {
  emit('select', noteId)
}

function handleSearchInput(e) {
  emit('update:searchQuery', e.target.value)
  // Reset selection when search changes
  emit('update:selectedIndex', 0)
}

function handleOverlayClick(e) {
  if (e.target === e.currentTarget) {
    emit('close')
  }
}
</script>

<template>
  <Teleport to="body">
    <div
      v-if="visible"
      class="suggestion-overlay"
      @click="handleOverlayClick"
    >
      <div
        class="suggestion-popup"
        :style="{ top: position.top + 'px', left: position.left + 'px' }"
        @keydown="handleKeydown"
      >
        <!-- Search Input -->
        <div class="suggestion-search">
          <input
            ref="searchInputRef"
            type="text"
            :value="searchQuery"
            placeholder="搜索笔记..."
            class="suggestion-search-input"
            @input="handleSearchInput"
            @keydown="handleKeydown"
          >
        </div>

        <!-- Note List -->
        <div ref="listRef" class="suggestion-list">
          <div
            v-for="(note, index) in notes"
            :key="note.id"
            class="suggestion-item"
            :class="{ selected: index === selectedIndex }"
            @click="handleNoteClick(note.id)"
            @dblclick="handleNoteDoubleClick(note.id)"
            @mouseenter="emit('update:selectedIndex', index)"
          >
            <div class="suggestion-item-title">{{ note.title || '无标题笔记' }}</div>
            <div v-if="note.excerpt" class="suggestion-item-excerpt">{{ note.excerpt }}</div>
          </div>
          <div v-if="notes.length === 0" class="suggestion-empty">
            <span v-if="searchQuery">未找到匹配的笔记</span>
            <span v-else>暂无笔记</span>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.suggestion-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  z-index: 10000;
}

.suggestion-popup {
  position: absolute;
  width: 260px;
  max-height: 220px;
  background: var(--modal-bg, #fff);
  border: 1px solid var(--modal-border, #ddd);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.suggestion-search {
  flex-shrink: 0;
}

.suggestion-search-input {
  width: 100%;
  padding: 7px 10px;
  border: none;
  font-size: 12px;
  background: var(--modal-input-bg, #f5f5f5);
  color: var(--modal-text, #333);
  box-sizing: border-box;
}

.suggestion-search-input:focus {
  outline: none;
  background: var(--modal-input-focus-bg, #eee);
}

.suggestion-search-input::placeholder {
  color: var(--modal-text-secondary, #aaa);
}

.suggestion-list {
  flex: 1;
  overflow-y: auto;
  max-height: 160px;
}

.suggestion-list::-webkit-scrollbar {
  width: 4px;
}

.suggestion-list::-webkit-scrollbar-thumb {
  background: var(--modal-scrollbar-thumb, #ccc);
  border-radius: 0;
}

.suggestion-list::-webkit-scrollbar-track {
  background: transparent;
}

.suggestion-item {
  padding: 6px 10px;
  cursor: pointer;
  border-bottom: 1px solid var(--modal-border, #f5f5f5);
  transition: background 0.1s;
}

.suggestion-item:last-child {
  border-bottom: none;
}

.suggestion-item:hover,
.suggestion-item.selected {
  background: var(--tag-filter-item-hover-bg, #f0f0f0);
}

.suggestion-item.selected {
  background: var(--tag-filter-selected-bg, #e8f4ff);
}

.suggestion-item-title {
  font-size: 12px;
  font-weight: 500;
  color: var(--modal-text, #333);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.suggestion-item-excerpt {
  font-size: 10px;
  color: var(--modal-text-secondary, #999);
  margin-top: 2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.suggestion-empty {
  padding: 16px;
  text-align: center;
  color: var(--modal-text-secondary, #aaa);
  font-size: 11px;
}
</style>
