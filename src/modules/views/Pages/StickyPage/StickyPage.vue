<script setup>
import { ref, reactive, computed, onMounted, nextTick } from 'vue'
import { useNotePage } from '../NotePage/useNotePage.js'
import { EventTypes } from '../../../core/EventTypes.js'
import { debounce } from '../../../utils/helpers.js'
import StickyNote from './StickyNote.vue'
import ArchiveModal from './components/ArchiveModal.vue'

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

// 下拉菜单展开状态
const isDropdownOpen = ref(false)

// 拖拽状态
const dragging = reactive({
  isDragging: false,
  stickyId: null,
  startX: 0,
  startY: 0,
  offsetX: 0,
  offsetY: 0,
  isOverTrash: false,
  isOverArchive: false
})

// 垃圾桶区域状态
const trashZone = reactive({
  isVisible: false,
  isHover: false
})

// 归档区域状态
const archiveZone = reactive({
  isVisible: false,
  isHover: false
})

// 归档弹窗状态
const isArchiveModalOpen = ref(false)

// 便签页 ID
const stickyPageId = computed(() => props.noteData.id)

// 获取便签页编辑器数据
function getEditor() {
  return state.editors.get(stickyPageId.value)
}

// 切换下拉菜单
function toggleDropdown() {
  isDropdownOpen.value = !isDropdownOpen.value
}

// 标题变化处理
function handleTitleInput(e) {
  const newTitle = e.target.value
  const editor = getEditor()
  if (editor && editor.noteData) {
    editor.noteData.title = newTitle
    if (window.eventBus) {
      window.eventBus.emit(EventTypes.NOTE.UPDATE.TITLE, stickyPageId.value, newTitle)
    }
  }
}

// 摘要变化处理
function handleExcerptInput(e) {
  const newExcerpt = e.target.value
  const editor = getEditor()
  if (editor && editor.noteData) {
    editor.noteData.excerpt = newExcerpt
    if (window.eventBus) {
      window.eventBus.emit(EventTypes.NOTE.UPDATE.EXCERPT, stickyPageId.value, newExcerpt)
    }
  }
}

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
    // 只加载未归档的便签
    stickies.value = data.filter(s => !s.archivedAt)
  }
}

// 创建新便签
async function handleCreateSticky() {
  // 在右上角位置创建新便签（确保便签完全在页面内）
  const stickyWidth = 180
  const x = window.innerWidth - 200 - stickyWidth - 20
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

  // 显示垃圾桶和归档区域
  trashZone.isVisible = true
  archiveZone.isVisible = true

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

  // 检查是否在垃圾桶区域
  const trashZoneEl = document.querySelector('.trash-zone')
  if (trashZoneEl) {
    const rect = trashZoneEl.getBoundingClientRect()
    dragging.isOverTrash = (
      e.clientX >= rect.left &&
      e.clientX <= rect.right &&
      e.clientY >= rect.top &&
      e.clientY <= rect.bottom
    )
    trashZone.isHover = dragging.isOverTrash
  }

  // 检查是否在归档区域
  const archiveZoneEl = document.querySelector('.archive-zone')
  if (archiveZoneEl) {
    const rect = archiveZoneEl.getBoundingClientRect()
    dragging.isOverArchive = (
      e.clientX >= rect.left &&
      e.clientX <= rect.right &&
      e.clientY >= rect.top &&
      e.clientY <= rect.bottom
    )
    archiveZone.isHover = dragging.isOverArchive
  }
}

// 防抖保存位置
const debouncedSavePosition = debounce((stickyId, x, y) => {
  handleStickyUpdate(stickyId, { x, y })
}, 100)

// 拖拽结束
function handleDragEnd(e) {
  if (!dragging.isDragging) return

  // 如果在垃圾桶区域上方，删除便签
  if (dragging.isOverTrash) {
    handleStickyDelete(dragging.stickyId)
  } else if (dragging.isOverArchive) {
    // 归档便签
    handleStickyArchive(dragging.stickyId)
  } else {
    const deltaX = e.clientX - dragging.startX
    const deltaY = e.clientY - dragging.startY

    const newX = dragging.offsetX + deltaX
    const newY = dragging.offsetY + deltaY

    // 保存最终位置
    debouncedSavePosition(dragging.stickyId, newX, newY)
  }

  // 隐藏垃圾桶和归档区域
  trashZone.isVisible = false
  trashZone.isHover = false
  archiveZone.isVisible = false
  archiveZone.isHover = false

  dragging.isDragging = false
  dragging.stickyId = null
  dragging.isOverTrash = false
  dragging.isOverArchive = false

  document.removeEventListener('mousemove', handleDragMove)
  document.removeEventListener('mouseup', handleDragEnd)
}

// 归档便签
async function handleStickyArchive(stickyId) {
  await window.stickyController.archiveSticky(stickyPageId.value, stickyId)
  // 从墙面移除（但数据还在，只是隐藏）
  stickies.value = stickies.value.filter(s => s.id !== stickyId)
  if (activeStickyId.value === stickyId) {
    activeStickyId.value = null
  }
}

// 取消归档便签
async function handleStickyUnarchive(stickyId) {
  const updated = await window.stickyController.unarchiveSticky(stickyPageId.value, stickyId)
  if (updated) {
    // 添加回墙面
    stickies.value.push(updated)
    // 从归档列表移除
    archivedStickies.value = archivedStickies.value.filter(s => s.id !== stickyId)
  }
}

// 归档便签列表
const archivedStickies = ref([])

// 打开归档弹窗
async function openArchiveModal() {
  isArchiveModalOpen.value = true
  // 加载归档便签
  const data = await window.stickyController.getArchivedStickies(stickyPageId.value)
  if (data) {
    archivedStickies.value = data
  }
}

// 关闭归档弹窗
function closeArchiveModal() {
  isArchiveModalOpen.value = false
}

// 切换归档弹窗
function toggleArchiveModal() {
  if (isArchiveModalOpen.value) {
    closeArchiveModal()
  } else {
    openArchiveModal()
  }
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
    <!-- 左上角设置面板 -->
    <div class="sticky-settings">
      <!-- 设置下拉菜单 -->
      <div v-if="isDropdownOpen" class="sticky-settings-dropdown">
          <!-- 标题编辑区 -->
          <div class="settings-section">
            <input
              type="text"
              class="sticky-title-input"
              :value="getEditor()?.noteData?.title || ''"
              placeholder="输入标题..."
              @input="handleTitleInput"
            >
          </div>

          <!-- 摘要编辑区 -->
          <div class="settings-section">
            <input
              type="text"
              class="sticky-excerpt-input"
              :value="getEditor()?.noteData?.excerpt || ''"
              placeholder="输入摘要..."
              maxlength="50"
              @input="handleExcerptInput"
            >
          </div>

          <!-- 标签区 -->
          <div class="note-tags-bar">
            <button
              v-if="getTagsDisplay().showAddBtn"
              class="btn-add-tag"
              @click="handleTagClick"
            >
              <i class="fas fa-plus"></i> 添加标签
            </button>
            <div class="note-tags-list">
              <span
                v-for="tag in getTagsDisplay().tags"
                :key="tag.id"
                class="note-tag-item"
                @click="handleTagClick"
              >
                <span class="note-tag-color" :style="{ backgroundColor: tag.color }"></span>
                <span class="note-tag-name">{{ tag.name }}</span>
              </span>
            </div>
          </div>
        </div>

      <!-- 切换按钮 -->
      <button
        class="sticky-settings-toggle"
        :class="{ open: isDropdownOpen }"
        @click="toggleDropdown"
      >
        <i class="fas fa-chevron-up"></i>
      </button>
    </div>

    <!-- 右上方归档按钮 -->
    <button class="btn-archive" @click="toggleArchiveModal" title="归档便签">
      <i class="fas fa-box"></i>
    </button>

    <!-- 右上方新建便签按钮 -->
    <button class="btn-new-sticky" @click="handleCreateSticky" title="新建便签">
      <i class="far fa-sticky-note"></i>
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

    <!-- 垃圾桶和归档区域 -->
    <Transition name="zones-fade">
      <div v-if="trashZone.isVisible || archiveZone.isVisible" class="drop-zones">
        <div v-if="archiveZone.isVisible" class="drop-zone archive-zone" :class="{ hover: archiveZone.isHover }">
          <i class="fas fa-box"></i>
        </div>
        <div v-if="trashZone.isVisible" class="drop-zone trash-zone" :class="{ hover: trashZone.isHover }">
          <i class="fas fa-trash-alt"></i>
        </div>
      </div>
    </Transition>

    <!-- 归档弹窗 -->
    <ArchiveModal
      :visible="isArchiveModalOpen"
      :stickyPageId="stickyPageId"
      @close="closeArchiveModal"
      @unarchive="handleStickyUnarchive"
    />
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

/* 左上角设置面板 */
.sticky-settings {
  position: absolute;
  top: 0;
  left: 30px;
  z-index: 100;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}

/* 设置下拉菜单 */
.sticky-settings-dropdown {
  background: var(--modal-bg);
  border: 1px solid var(--modal-border);
  border-radius: 0 0 12px 12px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
  padding: 12px;
  width: 240px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  position: relative;
  z-index: 99;
}

.settings-section {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

/* 便签页标签栏 */
.note-tags-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.note-tags-list {
  display: flex;
  flex: 1;
  gap: 8px;
  flex-wrap: wrap;
  align-items: center;
}

.note-tag-item {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  background: var(--editor-tags-bg);
  border-radius: 16px;
  cursor: pointer;
  transition: all 0.2s;
  border: 1px solid var(--editor-tags-border);
}

.note-tag-item:hover {
  background: var(--editor-tags-hover-bg);
  border-color: var(--text-muted);
}

.note-tag-color {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  flex-shrink: 0;
}

.note-tag-name {
  font-size: 12px;
  color: var(--text-primary);
}

.btn-add-tag {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background: transparent;
  border: 1px dashed var(--editor-add-tag-border);
  color: var(--editor-add-tag-color);
  padding: 4px 12px;
  border-radius: 16px;
  cursor: pointer;
  font-size: 12px;
  transition: all 0.2s;
  white-space: nowrap;
}

.btn-add-tag:hover {
  background: var(--editor-tags-hover-bg);
  border-color: var(--text-muted);
  color: var(--text-primary);
}

.sticky-title-input,
.sticky-excerpt-input {
  width: 100%;
  border: none;
  background: var(--editor-tags-bg);
  border-radius: 6px;
  padding: 8px 12px;
  font-size: 14px;
  color: var(--text-primary);
  outline: none;
  transition: border-color 0.2s;
}

.sticky-title-input:focus,
.sticky-excerpt-input:focus {
  border-color: var(--accent);
}

.sticky-title-input::placeholder,
.sticky-excerpt-input::placeholder {
  color: var(--text-muted);
}

/* 切换按钮 */
.sticky-settings-toggle {
  width: 40px;
  height: 24px;
  background: var(--modal-bg);
  border: 1px solid var(--modal-border);
  border-top: none;
  border-radius: 0 0 12px 12px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-muted);
  font-size: 12px;
  box-shadow: 0 4px 8px -2px rgba(0, 0, 0, 0.1);
  transition: background 0.2s;
  position: relative;
  z-index: 100;
  /* 居中于下拉菜单下方 */
  margin-top: -1px;
  margin-left: calc(240px / 2 - 20px);
}

.sticky-settings-toggle .fa-chevron-up {
  transition: transform 0.25s ease;
}

.sticky-settings-toggle:hover {
  background: var(--modal-bg);
  color: var(--accent);
}

.sticky-settings-toggle .fa-chevron-up {
  transform: rotate(180deg);
}

.sticky-settings-toggle.open .fa-chevron-up {
  transform: rotate(0deg);
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

/* 拖拽放下区域容器 */
.drop-zones {
  position: fixed;
  bottom: 30px;
  /* 水平居中（考虑侧边栏） */
  left: calc((100% - 250px) / 2 + 250px);
  transform: translateX(-50%);
  display: flex;
  gap: 20px;
  z-index: 9999;
}

/* 通用放下区域样式 */
.drop-zone {
  width: 60px;
  height: 60px;
  background: var(--modal-bg);
  border: 2px solid var(--modal-border);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-muted);
  font-size: 24px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
  transition: all 0.2s;
}

/* 垃圾桶悬停 */
.trash-zone.hover {
  background: #fee;
  border-color: #c44;
  color: #c44;
  transform: scale(1.1);
  box-shadow: 0 6px 20px rgba(204, 68, 68, 0.3);
}

.trash-zone i {
  transition: transform 0.2s;
}

.trash-zone.hover i {
  transform: scale(1.2);
}

/* 归档区域悬停 */
.archive-zone.hover {
  background: #efe;
  border-color: #4a4;
  color: #4a4;
  transform: scale(1.1);
  box-shadow: 0 6px 20px rgba(68, 170, 68, 0.3);
}

.archive-zone i {
  transition: transform 0.2s;
}

.archive-zone.hover i {
  transform: scale(1.2);
}

/* 放下区域浮现动画 */
.zones-fade-enter-active,
.zones-fade-leave-active {
  transition: opacity 0.2s;
}

.zones-fade-enter-from,
.zones-fade-leave-to {
  opacity: 0;
}

/* 归档浮现动画 */
.archive-fade-enter-active,
.archive-fade-leave-active {
  transition: opacity 0.2s;
}

.archive-fade-enter-from,
.archive-fade-leave-to {
  opacity: 0;
}

/* 归档按钮 - 与新建按钮一致 */
.btn-archive {
  position: absolute;
  top: 16px;
  right: 80px;
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

.btn-archive:hover {
  transform: scale(1.1);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

/* 归档浮现动画 */
.archive-fade-enter-active,
.archive-fade-leave-active {
  transition: opacity 0.2s;
}

.archive-fade-enter-from,
.archive-fade-leave-to {
  opacity: 0;
}
</style>

