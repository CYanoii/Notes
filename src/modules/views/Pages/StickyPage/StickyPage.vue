<script setup>
import { ref, reactive, computed, onMounted, nextTick } from 'vue'
import { useNotePage } from '../NotePage/useNotePage.js'
import { EventTypes } from '../../../core/EventTypes.js'
import { debounce } from '../../../utils/helpers.js'
import StickyNote from './StickyNote.vue'

const props = defineProps({
  noteData: { type: Object, required: true }
})

// 从 useNotePage 获取标签相关功能
const {
  state,
  updateNoteTags,
  getActiveNoteId
} = useNotePage()

// 便签墙状态
const stickies = ref([])
const activeStickyId = ref(null)
const wallRef = ref(null)

// 拖拽状态
const dragging = reactive({
  isDragging: false,
  stickyId: null,
  startX: 0,
  startY: 0,
  offsetX: 0,
  offsetY: 0
})

// 便签页 ID
const stickyPageId = computed(() => props.noteData.id)

// 获取标签显示数据
function getTagsDisplay() {
  const editor = state.editors.get(stickyPageId.value)
  if (!editor) return { showAddBtn: false, tags: [] }

  const noteTags = Array.isArray(editor.noteData?.tags) ? editor.noteData.tags : []
  const isTrashed = editor.noteData?.status === 'trashed'
  const hasTags = noteTags.length > 0

  return {
    showAddBtn: !isTrashed && !hasTags,
    tags: noteTags.map(tagId => {
      const tag = editor.allTags?.find(t => t.id === tagId)
      return tag ? { id: tagId, name: tag.name, color: tag.color } : null
    }).filter(Boolean)
  }
}

// 标签点击处理
function handleTagClick() {
  if (window.eventBus) {
    window.eventBus.emit(EventTypes.PAGE.UPDATE.TAG, stickyPageId.value)
  }
}

// 加载便签数据
async function loadStickies() {
  const data = await window.stickyController.loadStickies(stickyPageId.value)
  if (data) {
    stickies.value = data
  }
}

// 创建新便签
async function handleCreateSticky() {
  // 在右上角位置创建新便签
  const x = window.innerWidth - 250
  const y = 80
  const newSticky = await window.stickyController.createSticky(stickyPageId.value, { x, y })
  if (newSticky) {
    stickies.value.push(newSticky)
    // 激活并聚焦新便签
    activeStickyId.value = newSticky.id
    await nextTick()
    focusSticky(newSticky.id)
  }
}

// 更新便签
async function handleStickyUpdate(stickyId, updates) {
  // 检查便签是否还存在（可能被删除）
  if (!stickies.value.some(s => s.id === stickyId)) {
    return
  }
  const updated = await window.stickyController.updateSticky(stickyPageId.value, stickyId, updates)
  if (updated) {
    const index = stickies.value.findIndex(s => s.id === stickyId)
    if (index !== -1) {
      stickies.value[index] = updated
    }
  }
}

// 删除便签
async function handleStickyDelete(stickyId) {
  await window.stickyController.deleteSticky(stickyPageId.value, stickyId)
  stickies.value = stickies.value.filter(s => s.id !== stickyId)
  if (activeStickyId.value === stickyId) {
    activeStickyId.value = null
  }
}

// 聚焦便签
async function focusSticky(stickyId) {
  const stickyComponent = stickyRefs.value[stickyId]
  if (stickyComponent) {
    stickyComponent.focusContent()
  }
}

// 便签获得焦点
async function handleStickyFocus(stickyId) {
  activeStickyId.value = stickyId
  // 将便签置于顶层
  const updated = await window.stickyController.bringToFront(stickyPageId.value, stickyId)
  if (updated) {
    const index = stickies.value.findIndex(s => s.id === stickyId)
    if (index !== -1) {
      stickies.value[index] = updated
    }
  }
}

// 拖拽开始
function handleDragStart(stickyId, e) {
  const sticky = stickies.value.find(s => s.id === stickyId)
  if (!sticky) return

  dragging.isDragging = true
  dragging.stickyId = stickyId
  dragging.startX = e.clientX
  dragging.startY = e.clientY
  dragging.offsetX = sticky.x
  dragging.offsetY = sticky.y

  document.addEventListener('mousemove', handleDragMove)
  document.addEventListener('mouseup', handleDragEnd)
}

// 拖拽移动
function handleDragMove(e) {
  if (!dragging.isDragging) return

  const deltaX = e.clientX - dragging.startX
  const deltaY = e.clientY - dragging.startY

  const newX = dragging.offsetX + deltaX
  const newY = dragging.offsetY + deltaY

  // 更新本地状态实现即时反馈
  const sticky = stickies.value.find(s => s.id === dragging.stickyId)
  if (sticky) {
    sticky.x = newX
    sticky.y = newY
  }
}

// 防抖保存位置
const debouncedSavePosition = debounce((stickyId, x, y) => {
  handleStickyUpdate(stickyId, { x, y })
}, 100)

// 拖拽结束
function handleDragEnd(e) {
  if (!dragging.isDragging) return

  const deltaX = e.clientX - dragging.startX
  const deltaY = e.clientY - dragging.startY

  const newX = dragging.offsetX + deltaX
  const newY = dragging.offsetY + deltaY

  // 保存最终位置
  debouncedSavePosition(dragging.stickyId, newX, newY)

  dragging.isDragging = false
  dragging.stickyId = null

  document.removeEventListener('mousemove', handleDragMove)
  document.removeEventListener('mouseup', handleDragEnd)
}

// 便签组件引用
const stickyRefs = ref({})

// 设置便签组件引用
function setStickyRef(stickyId, component) {
  if (component) {
    stickyRefs.value[stickyId] = component
  }
}

// 初始化
onMounted(() => {
  loadStickies()
})
</script>

<template>
  <div class="sticky-page">
    <!-- 左上角标签栏 -->
    <div
      class="sticky-tags-bar"
      :data-note-id="stickyPageId"
    >
      <button
        v-if="getTagsDisplay().showAddBtn"
        class="btn-add-tag"
        @click="handleTagClick"
      >
        <i class="fas fa-plus"></i> 添加标签
      </button>
      <div class="sticky-tags-list">
        <span
          v-for="tag in getTagsDisplay().tags"
          :key="tag.id"
          class="sticky-tag-item"
          :data-tag-id="tag.id"
          @click="handleTagClick"
        >
          <span
            class="sticky-tag-color"
            :style="{ backgroundColor: tag.color }"
          ></span>
          <span class="sticky-tag-name">{{ tag.name }}</span>
        </span>
      </div>
    </div>

    <!-- 右上方新建便签按钮 -->
    <button class="btn-new-sticky" @click="handleCreateSticky" title="新建便签">
      <i class="fas fa-plus"></i>
    </button>

    <!-- 便签墙 -->
    <div ref="wallRef" class="sticky-wall">
      <StickyNote
        v-for="sticky in stickies"
        :key="sticky.id"
        :ref="(el) => setStickyRef(sticky.id, el)"
        :stickyData="sticky"
        :isActive="activeStickyId === sticky.id"
        @update="(updates) => handleStickyUpdate(sticky.id, updates)"
        @delete="() => handleStickyDelete(sticky.id)"
        @dragstart="(e) => handleDragStart(sticky.id, e)"
        @focus="() => handleStickyFocus(sticky.id)"
      />
    </div>
  </div>
</template>

<style scoped>
.sticky-page {
  width: 100%;
  height: 100%;
  background: var(--editor-bg);
  display: flex;
  flex-direction: column;
  position: relative;
  overflow: hidden;
}

/* 左上角标签栏 */
.sticky-tags-bar {
  position: absolute;
  top: 16px;
  left: 16px;
  display: flex;
  align-items: center;
  gap: 8px;
  z-index: 100;
  background: var(--modal-bg);
  padding: 8px 12px;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.sticky-tags-list {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.sticky-tag-item {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  background: var(--editor-tags-bg);
  border-radius: 12px;
  cursor: pointer;
  font-size: 12px;
}

.sticky-tag-color {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.sticky-tag-name {
  color: var(--text-primary);
}

.btn-add-tag {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background: transparent;
  border: 1px dashed var(--editor-add-tag-border);
  color: var(--editor-add-tag-color);
  padding: 4px 10px;
  border-radius: 12px;
  cursor: pointer;
  font-size: 12px;
  transition: all 0.2s;
}

.btn-add-tag:hover {
  border-color: var(--accent);
  color: var(--accent);
}

/* 右上角新建按钮 */
.btn-new-sticky {
  position: absolute;
  top: 16px;
  right: 16px;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: var(--accent);
  color: white;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  z-index: 100;
  transition: transform 0.2s, box-shadow 0.2s;
}

.btn-new-sticky:hover {
  transform: scale(1.1);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

/* 便签墙 */
.sticky-wall {
  flex: 1;
  position: relative;
  overflow: hidden;
}
</style>
