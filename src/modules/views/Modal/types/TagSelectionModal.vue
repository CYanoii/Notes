<script setup>
const props = defineProps({
  modal: { type: Object, required: true }
})

const emit = defineEmits(['close', 'confirm', 'tagToggle'])

function handleConfirm() {
  emit('confirm', props.modal.id, Array.from(props.modal.selected))
}

function handleCancel() {
  emit('close', props.modal.id, null)
}

function handleTagToggle(tagId) {
  emit('tagToggle', props.modal.id, tagId)
}
</script>

<template>
  <div class="modal-container">
    <div class="modal-header">
      <h3 class="modal-title">选择标签</h3>
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
</template>

<style scoped>
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
</style>