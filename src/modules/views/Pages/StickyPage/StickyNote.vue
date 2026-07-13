<script setup>
import { ref, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { debounce } from '../../../utils/helpers.js'
import { useWikiLink } from '../WikiLink/useWikiLink.js'
import NoteSuggestionPopup from '../WikiLink/NoteSuggestionPopup.vue'
import { EventTypes } from '../../../core/EventTypes.js'

const props = defineProps({
  stickyData: {
    type: Object,
    required: true
  },
  isActive: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update', 'delete', 'dragstart', 'dragend', 'focus', 'wikiLinkClose'])

// 引用 DOM 元素
const stickyRef = ref(null)
const contentRef = ref(null)

// 是否正在由用户输入（避免外部更新时干扰）
const isUserInputting = ref(false)

// 颜色选项
const colorOptions = [
  { name: '黄色', bg: '#fff9c4', header: '#fff176' },
  { name: '粉色', bg: '#f8bbd9', header: '#f48fb1' },
  { name: '蓝色', bg: '#bbdefb', header: '#90caf9' },
  { name: '绿色', bg: '#c8e6c9', header: '#a5d6a7' },
  { name: '紫色', bg: '#e1bee7', header: '#ce93d8' },
  { name: '橙色', bg: '#ffe0b2', header: '#ffcc80' }
]

// 颜色选择下拉展开状态
const isColorOpen = ref(false)

// Wiki Link 初始化
const wikiLink = useWikiLink()
const { notePicker } = wikiLink

// 创建 ContentEditable 适配器
function createStickyAdapter() {
  return wikiLink.createContentEditableAdapter(contentRef.value)
}

// Wiki link 检测处理
function handleWikiLinkInput() {
  wikiLink.detectTrigger(
    () => props.stickyData.id,
    () => false  // 便签页不在回收站
  )
}

function handleWikiLinkClick(e) {
  const linkEl = e.target.closest('.wiki-link')

  // 处理 Ctrl/Cmd + 点击 wiki link 跳转（不弹 picker）
  if (linkEl && (e.ctrlKey || e.metaKey)) {
    e.preventDefault()
    const noteId = linkEl.dataset.noteId
    if (noteId && window.eventBus) {
      window.eventBus.emit(EventTypes.NOTE.OPEN, { id: noteId })
    }
    return
  }

  // 使用点击后的 selection 检测光标位置
  const selection = window.getSelection()
  if (selection && selection.rangeCount > 0) {
    const range = selection.getRangeAt(0)
    // 确保光标在 contentRef 内
    if (contentRef.value?.contains(range.startContainer)) {
      wikiLink.checkCursorForWikiLinkWithRange(range, () => props.stickyData.id)
    }
  }
}

function handleWikiLinkKeyup(e) {
  if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End', 'PageUp', 'PageDown'].includes(e.key)) {
    wikiLink.checkCursorForWikiLink(() => props.stickyData.id)
  }
}

// Wiki link 选择处理
function handleWikiLinkSelect(noteId) {
  const adapter = createStickyAdapter()
  if (adapter) {
    wikiLink.handleNotePickerSelect(adapter, noteId)
  }
}

function handleWikiLinkClose(direction) {
  wikiLink.closeNotePicker(direction)
  emit('wikiLinkClose', direction)
}

// Wiki link 点击跳转（Ctrl/Cmd + 点击）
function handleStickyWikiLinkClick(e) {
  const wikiLink_el = e.target.closest('.wiki-link')
  if (!wikiLink_el) return
  if (e.ctrlKey || e.metaKey) {
    e.preventDefault()
    e.stopPropagation()
    const noteId = wikiLink_el.dataset.noteId
    if (noteId && window.eventBus) {
      window.eventBus.emit(EventTypes.NOTE.OPEN, { id: noteId })
    }
  }
}

// 将文本中的 [[...]] 替换为 wiki-link span
function replaceTextWithWikiLinks(parent, textNode, text) {
  const fragment = document.createDocumentFragment()
  let lastIndex = 0
  const regex = /\[\[([^\]]+)\]\]/g
  let match

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      fragment.appendChild(document.createTextNode(text.slice(lastIndex, match.index)))
    }
    fragment.appendChild(createWikiLinkSpan(match[0]))
    lastIndex = regex.lastIndex
  }
  if (lastIndex < text.length) {
    fragment.appendChild(document.createTextNode(text.slice(lastIndex)))
  }

  parent.replaceChild(fragment, textNode)
}

// 创建 wiki-link span（设置为 contenteditable="false" 防止在 span 内输入）
function createWikiLinkSpan(fullText) {
  const span = document.createElement('span')
  span.className = 'wiki-link'
  span.textContent = fullText
  span.contentEditable = 'false'
  // 从 [[id|title]] 中提取 id
  const match = fullText.match(/^\[\[([^\]|]+)(?:\|[^\]]+)?\]\]$/)
  if (match) {
    span.dataset.noteId = match[1]
  }
  return span
}

// 渲染文本节点中的 wiki link 样式
function renderWikiLinkStyle(textNode) {
  const text = textNode.textContent
  if (!/\[\[[^\]]+\]\]/.test(text)) return

  const parent = textNode.parentNode
  if (!parent || parent.classList.contains('wiki-link')) return

  replaceTextWithWikiLinks(parent, textNode, text)
}

// 遍历节点处理 wiki link
function walkTextNodes(node) {
  if (node.nodeType === Node.TEXT_NODE) {
    renderWikiLinkStyle(node)
  } else if (node.nodeType === Node.ELEMENT_NODE && !node.classList.contains('wiki-link')) {
    if (!node.classList.contains('vditor-ir__marker') && node.getAttribute('data-type') !== 'html-inline') {
      node.childNodes.forEach(walkTextNodes)
    }
  }
}

// Wiki link 突变观察器
let wikiLinkObserver = null

// 初始化内容
onMounted(() => {
  if (contentRef.value) {
    contentRef.value.innerText = props.stickyData.content || ''

    // 初始化时遍历已有内容
    walkTextNodes(contentRef.value)

    // 设置 MutationObserver 监听内容变化
    wikiLinkObserver = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList') {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              walkTextNodes(node)
            } else if (node.nodeType === Node.TEXT_NODE) {
              renderWikiLinkStyle(node)
            }
          })
        } else if (mutation.type === 'characterData') {
          walkTextNodes(mutation.target.parentNode)
        }
      })
    })

    wikiLinkObserver.observe(contentRef.value, { childList: true, subtree: true, characterData: true })
  }
})

// 清理观察器
onUnmounted(() => {
  if (wikiLinkObserver) {
    wikiLinkObserver.disconnect()
    wikiLinkObserver = null
  }
})

// 监听外部内容变化，更新 DOM
watch(() => props.stickyData.content, (newContent) => {
  if (isUserInputting.value) return
  if (contentRef.value && contentRef.value.innerText !== newContent) {
    contentRef.value.innerText = newContent || ''
  }
})

// 防抖保存内容
const debouncedSaveContent = debounce((content) => {
  emit('update', { content })
}, 500)

// 内容变化处理
function handleContentInput(e) {
  isUserInputting.value = true
  const content = e.target.innerText
  debouncedSaveContent(content)
  // 短暂延迟后重置标志，让外部更新可以生效
  setTimeout(() => {
    isUserInputting.value = false
  }, 600)
  // Wiki link 检测
  handleWikiLinkInput()
}

// 切换颜色下拉
function toggleColorDropdown(e) {
  e.stopPropagation()
  isColorOpen.value = !isColorOpen.value
}

// 选择颜色
function selectColor(color) {
  isColorOpen.value = false
  emit('update', { color: color.bg, headerColor: color.header })
}

// 点击外部关闭颜色下拉
function handleClickOutside(e) {
  if (isColorOpen.value) {
    isColorOpen.value = false
  }
}

// 便签获得焦点
function handleFocus() {
  emit('focus')
}

// 拖拽开始
function handleDragStart(e) {
  emit('dragstart', e)
}

// 暴露方法给父组件获取元素引用
defineExpose({
  getElement: () => stickyRef.value,
  focusContent: () => {
    if (contentRef.value) {
      contentRef.value.focus()
    }
  }
})
</script>

<template>
  <div
    ref="stickyRef"
    class="sticky-note"
    :class="{ active: isActive }"
    :style="{
      left: stickyData.x + 'px',
      top: stickyData.y + 'px',
      zIndex: stickyData.zIndex,
      backgroundColor: stickyData.color || '#fff9c4'
    }"
    @click="handleClickOutside"
  >
    <!-- 便签头部 -->
    <div
      class="sticky-header"
      :style="{ backgroundColor: stickyData.headerColor || '#fff176' }"
      @mousedown.stop="handleDragStart"
    >
      <!-- 颜色选择器 -->
      <div class="color-picker">
        <button
          class="color-dot"
          :style="{ backgroundColor: stickyData.color || '#fff9c4' }"
          @click.stop="toggleColorDropdown"
          title="切换颜色"
        ></button>
        <div v-if="isColorOpen" class="color-dropdown">
          <button
            v-for="color in colorOptions"
            :key="color.name"
            class="color-option"
            :class="{ active: (stickyData.color || '#fff9c4') === color.bg }"
            :style="{ backgroundColor: color.bg }"
            :title="color.name"
            @click.stop="selectColor(color)"
          >
            <i v-if="(stickyData.color || '#fff9c4') === color.bg" class="fas fa-check check-icon"></i>
          </button>
        </div>
      </div>
    </div>

    <!-- 便签内容 -->
    <div
      ref="contentRef"
      class="sticky-content"
      contenteditable="true"
      @input="handleContentInput"
      @focus="handleFocus"
      @blur="debouncedSaveContent(contentRef?.innerText || '')"
      @click="handleWikiLinkClick"
      @keyup="handleWikiLinkKeyup"
    ></div>
  </div>

  <!-- Wiki Link 笔记选择浮层 -->
  <NoteSuggestionPopup
    :visible="notePicker.visible"
    :notes="notePicker.notes"
    :selectedIndex="notePicker.selectedIndex"
    :searchQuery="notePicker.searchQuery"
    :position="notePicker.position"
    @update:searchQuery="wikiLink.updateNotePickerSearch"
    @update:selectedIndex="(idx) => notePicker.selectedIndex = idx"
    @select="handleWikiLinkSelect"
    @close="handleWikiLinkClose"
  />
</template>

<style scoped>
.sticky-note {
  position: absolute;
  width: 180px;
  min-height: 200px;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12), 0 2px 4px rgba(0, 0, 0, 0.08);
  display: flex;
  flex-direction: column;
  transition: box-shadow 0.2s;
}

.sticky-note:hover {
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.15), 0 4px 8px rgba(0, 0, 0, 0.1);
}

.sticky-note.active {
  box-shadow: 0 12px 28px rgba(0, 0, 0, 0.2), 0 6px 12px rgba(0, 0, 0, 0.12);
}

.sticky-header {
  display: flex;
  align-items: center;
  padding: 5px 10px;
  border-radius: 12px 12px 0 0;
  cursor: move;
  min-height: 26px;
}

.color-picker {
  position: relative;
}

.color-dot {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  border: none;
  cursor: pointer;
}

.color-dropdown {
  position: absolute;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%);
  background: var(--modal-bg);
  border: 1px solid var(--modal-border);
  border-radius: 20px;
  padding: 6px 8px;
  display: flex;
  flex-direction: row;
  gap: 6px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 1000;
}

.color-option {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.15s ease;
  padding: 0;
}

.color-option:hover {
  transform: scale(1.15);
}

.color-option .check-icon {
  color: white;
  font-size: 8px;
  animation: checkBounce 0.15s ease-out;
}

@keyframes checkBounce {
  0% {
    transform: scale(0);
    opacity: 0;
  }
  60% {
    transform: scale(1.2);
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
}

.sticky-content {
  flex: 1;
  padding: 14px 16px;
  font-size: 15px;
  line-height: 1.7;
  color: #333;
  font-family: "Segoe UI", "Microsoft YaHei", "PingFang SC", sans-serif;
  outline: none;
  word-wrap: break-word;
  overflow-y: auto;
}

/* Wiki link 样式 - 与 NotePage 保持一致 */
:deep(.wiki-link) {
  color: var(--accent);
  cursor: pointer;
  text-decoration: none;
  border-bottom: 1px dashed var(--accent);
  transition: opacity 0.2s;
}

:deep(.wiki-link:hover) {
  opacity: 0.8;
  border-bottom-style: solid;
}
</style>
