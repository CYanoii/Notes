<script setup>
import { computed, ref } from 'vue'

const props = defineProps({
  modal: { type: Object, required: true }
})

const emit = defineEmits(['close', 'confirm', 'tagToggle', 'updatePath', 'selectFolder', 'clearPath'])

const localValue = ref(props.modal.defaultValue || '')

// 根据类型计算样式类
const containerClass = computed(() => {
  if (props.modal.type === 'settings') return 'settings-popover'
  return 'modal-container'
})

const headerTitle = computed(() => {
  switch (props.modal.type) {
    case 'prompt': return props.modal.title
    case 'confirm': return '确认删除'
    case 'tagSelection': return '选择标签'
    case 'settings': return '设置'
    default: return ''
  }
})

function handleClose(result = null) {
  emit('close', props.modal.id, result)
}

function handleConfirm() {
  if (props.modal.type === 'prompt') {
    const value = localValue.value.trim()
    handleClose(value || null)
  } else if (props.modal.type === 'confirm') {
    handleClose(true)
  } else if (props.modal.type === 'tagSelection') {
    handleClose(Array.from(props.modal.selected))
  }
}

function handleCancel() {
  if (props.modal.type === 'settings') {
    handleClose()
  } else {
    handleClose(null)
  }
}

function handleTagToggle(tagId) {
  emit('tagToggle', props.modal.id, tagId)
}

function handleOverlayClick(e) {
  if (e.target === e.currentTarget) {
    handleCancel()
  }
}

function handleApply() {
  window.electronAPI.applyConfigAndReload('dataRootPath', props.modal.tempDataRootPath)
  handleClose()
  window.location.reload()
}

async function handleSelectFolder() {
  const folderPath = await window.electronAPI.selectFolder()
  if (folderPath) {
    emit('updatePath', props.modal.id, folderPath)
  }
}

function handleClearPath() {
  emit('updatePath', props.modal.id, '')
}
</script>

<template>
  <Teleport to="body">
    <div class="modal-overlay" @click="handleOverlayClick">
      <!-- Prompt 模态框 -->
      <div v-if="modal.type === 'prompt'" :class="containerClass">
        <div class="modal-header">
          <h3 class="modal-title">{{ headerTitle }}</h3>
          <button class="modal-close-btn" @click="handleCancel">
            <i class="fas fa-times"></i>
          </button>
        </div>
        <div class="modal-body">
          <input
            type="text"
            class="modal-input"
            v-model="localValue"
            :placeholder="modal.defaultValue ? '' : '请输入标签名称'"
            @keydown.enter="handleConfirm"
            @keydown.esc="handleCancel"
          >
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary modal-cancel" @click="handleCancel">取消</button>
          <button class="btn btn-primary modal-confirm" @click="handleConfirm">确定</button>
        </div>
      </div>

      <!-- Confirm 模态框 -->
      <div v-else-if="modal.type === 'confirm'" :class="containerClass">
        <div class="modal-header">
          <h3 class="modal-title">{{ headerTitle }}</h3>
          <button class="modal-close-btn" @click="handleCancel">
            <i class="fas fa-times"></i>
          </button>
        </div>
        <div class="modal-body">
          <p class="modal-message">{{ modal.message }}</p>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary modal-cancel" @click="handleCancel">取消</button>
          <button class="btn btn-danger modal-confirm" @click="handleConfirm">确定删除</button>
        </div>
      </div>

      <!-- TagSelection 模态框 -->
      <div v-else-if="modal.type === 'tagSelection'" :class="containerClass">
        <div class="modal-header">
          <h3 class="modal-title">{{ headerTitle }}</h3>
          <button class="modal-close-btn" @click="handleCancel">
            <i class="fas fa-times"></i>
          </button>
        </div>
        <div class="modal-body">
          <div class="tag-select-list">
            <div
              v-for="tag in modal.allTags"
              :key="tag.id"
              class="tag-select-item"
              :class="{ selected: modal.selected.includes(tag.id) }"
              @click="handleTagToggle(tag.id)"
            >
              <div class="tag-select-check"></div>
              <span class="tag-select-color" :style="{ backgroundColor: tag.color }"></span>
              <span class="tag-select-name">{{ tag.name }}</span>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary modal-cancel" @click="handleCancel">取消</button>
          <button class="btn btn-primary modal-confirm" @click="handleConfirm">确定</button>
        </div>
      </div>

      <!-- Settings 浮出窗口 -->
      <div v-else-if="modal.type === 'settings'" :class="containerClass">
        <div class="settings-popover-header">
          <h3 class="settings-popover-title">{{ headerTitle }}</h3>
          <button class="settings-popover-close" @click="handleCancel">
            <i class="fas fa-times"></i>
          </button>
        </div>
        <div class="settings-popover-body">
          <div class="settings-item" v-if="modal.config">
            <label class="settings-label">数据目录</label>
            <div class="settings-path-row">
              <input
                type="text"
                class="settings-path-input"
                :value="modal.tempDataRootPath"
                placeholder="留空使用默认路径"
                readonly
              >
              <button class="settings-select-btn" @click="handleSelectFolder">选择</button>
              <button class="settings-clear-btn" title="清除并使用默认路径" @click="handleClearPath">×</button>
            </div>
          </div>
          <div v-else class="settings-loading">加载中...</div>
        </div>
        <div class="settings-popover-footer">
          <button class="btn btn-primary settings-apply-btn" @click="handleApply">应用</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9998;
}

.modal-container {
  background: white;
  border-radius: 8px;
  min-width: 400px;
  max-width: 500px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid #eee;
}

.modal-title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
}

.modal-close-btn {
  background: none;
  border: none;
  cursor: pointer;
  padding: 4px;
  color: #666;
}

.modal-close-btn:hover {
  color: #333;
}

.modal-body {
  padding: 20px;
}

.modal-input {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
  box-sizing: border-box;
}

.modal-input:focus {
  outline: none;
  border-color: #4299e1;
}

.modal-message {
  margin: 0;
  font-size: 14px;
  color: #333;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 16px 20px;
  border-top: 1px solid #eee;
}

.btn {
  padding: 8px 16px;
  border-radius: 4px;
  border: none;
  cursor: pointer;
  font-size: 14px;
}

.btn-secondary {
  background: #e2e8f0;
  color: #4a5568;
}

.btn-secondary:hover {
  background: #cbd5e0;
}

.btn-primary {
  background: #4299e1;
  color: white;
}

.btn-primary:hover {
  background: #3182ce;
}

.btn-danger {
  background: #e53e3e;
  color: white;
}

.btn-danger:hover {
  background: #c53030;
}

/* Tag Selection */
.tag-select-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 300px;
  overflow-y: auto;
}

.tag-select-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 4px;
  cursor: pointer;
  transition: background 0.2s;
}

.tag-select-item:hover {
  background: #f7fafc;
}

.tag-select-item.selected {
  background: #ebf8ff;
}

.tag-select-check {
  width: 18px;
  height: 18px;
  border: 2px solid #cbd5e0;
  border-radius: 3px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.tag-select-item.selected .tag-select-check {
  background: #4299e1;
  border-color: #4299e1;
}

.tag-select-item.selected .tag-select-check::after {
  content: '✓';
  color: white;
  font-size: 12px;
}

.tag-select-color {
  width: 16px;
  height: 16px;
  border-radius: 3px;
}

.tag-select-name {
  font-size: 14px;
  color: #333;
}

/* Settings Popover */
.settings-popover {
  background: white;
  border-radius: 8px;
  min-width: 450px;
  max-width: 1000px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  display: flex;
  flex-direction: column;
  max-height: 90vh;
}

.settings-popover-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid #eee;
}

.settings-popover-title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
}

.settings-popover-close {
  background: none;
  border: none;
  cursor: pointer;
  padding: 4px;
  color: #666;
}

.settings-popover-close:hover {
  color: #333;
}

.settings-popover-body {
  padding: 20px;
  flex: 1;
  overflow-y: auto;
}

.settings-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.settings-label {
  font-size: 14px;
  color: #4a5568;
  font-weight: 500;
}

.settings-path-row {
  display: flex;
  gap: 8px;
}

.settings-path-input {
  flex: 1;
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
  background: #f7fafc;
}

.settings-select-btn {
  padding: 8px 12px;
  border: 1px solid #4299e1;
  border-radius: 4px;
  background: #ebf8ff;
  color: #2b6cb0;
  cursor: pointer;
  font-size: 14px;
}

.settings-select-btn:hover {
  background: #bee3f8;
}

.settings-clear-btn {
  width: 38px;
  height: 38px;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid #e53e3e;
  border-radius: 4px;
  background: white;
  color: #e53e3e;
  cursor: pointer;
  font-size: 18px;
  font-weight: bold;
}

.settings-clear-btn:hover {
  background: #fff5f5;
}

.settings-popover-footer {
  display: flex;
  justify-content: flex-end;
  padding: 16px 20px;
  border-top: 1px solid #eee;
}

.settings-loading {
  text-align: center;
  padding: 20px;
  color: #666;
}
</style>