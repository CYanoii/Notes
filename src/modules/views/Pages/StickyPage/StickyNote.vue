<script setup>
import { ref, watch, onMounted, nextTick } from 'vue'
import { debounce } from '../../../utils/helpers.js'

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

const emit = defineEmits(['update', 'delete', 'dragstart', 'dragend', 'focus'])

// 引用 DOM 元素
const stickyRef = ref(null)
const contentRef = ref(null)

// 本地内容状态
const localContent = ref(props.stickyData.content || '')

// 监听 props 变化同步本地状态
watch(() => props.stickyData.content, (newContent) => {
  if (newContent !== localContent.value) {
    localContent.value = newContent
  }
})

// 防抖保存内容
const debouncedSaveContent = debounce((content) => {
  emit('update', { content })
}, 500)

// 内容变化处理
function handleContentInput(e) {
  localContent.value = e.target.innerText
  debouncedSaveContent(localContent.value)
}

// 删除便签
function handleDelete(e) {
  e.stopPropagation()
  emit('delete')
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
      zIndex: stickyData.zIndex
    }"
    @mousedown.stop="handleDragStart"
  >
    <!-- 便签头部 -->
    <div class="sticky-header">
      <button class="sticky-delete-btn" @click="handleDelete" title="删除便签">
        <i class="fas fa-times"></i>
      </button>
    </div>

    <!-- 便签内容 -->
    <div
      ref="contentRef"
      class="sticky-content"
      contenteditable="true"
      @input="handleContentInput"
      @focus="handleFocus"
      @blur="debouncedSaveContent(localContent)"
      v-text="localContent"
    ></div>
  </div>
</template>

<style scoped>
.sticky-note {
  position: absolute;
  width: 200px;
  min-height: 150px;
  background: #fff9c4;
  border-radius: 2px;
  box-shadow: 2px 4px 8px rgba(0, 0, 0, 0.15);
  cursor: move;
  user-select: none;
  display: flex;
  flex-direction: column;
}

.sticky-note.active {
  box-shadow: 4px 8px 16px rgba(0, 0, 0, 0.25);
}

.sticky-header {
  display: flex;
  justify-content: flex-end;
  padding: 4px;
  background: #fff176;
  border-radius: 2px 2px 0 0;
}

.sticky-delete-btn {
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 2px 6px;
  color: #f57f17;
  opacity: 0.6;
  transition: opacity 0.2s;
}

.sticky-delete-btn:hover {
  opacity: 1;
}

.sticky-content {
  flex: 1;
  padding: 12px;
  font-size: 14px;
  line-height: 1.5;
  color: #333;
  outline: none;
  word-wrap: break-word;
  overflow-y: auto;
}

.sticky-content:empty::before {
  content: '输入内容...';
  color: #999;
}
</style>
