<script setup>
import { ref } from 'vue'

const props = defineProps({
  modal: { type: Object, required: true }
})

const emit = defineEmits(['close', 'confirm'])

const localValue = ref(props.modal.defaultValue || '')

function handleConfirm() {
  const value = localValue.value.trim()
  emit('confirm', props.modal.id, value || null)
}

function handleCancel() {
  emit('close', props.modal.id, null)
}
</script>

<template>
  <div class="modal-container">
    <div class="modal-header">
      <h3 class="modal-title">{{ modal.title }}</h3>
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
</template>

<style scoped>
.modal-container {
  background: var(--modal-bg);
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
  border-bottom: 1px solid var(--modal-border);
}

.modal-title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--modal-text);
}

.modal-close-btn {
  background: none;
  border: none;
  cursor: pointer;
  padding: 4px;
  color: var(--modal-text-secondary);
}

.modal-close-btn:hover {
  color: var(--modal-text);
}

.modal-body {
  padding: 20px;
}

.modal-input {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid var(--modal-border);
  border-radius: 4px;
  font-size: 14px;
  box-sizing: border-box;
  background: var(--tag-filter-item-bg);
  color: var(--modal-text);
}

.modal-input:focus {
  outline: none;
  border-color: var(--accent);
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 16px 20px;
  border-top: 1px solid var(--modal-border);
}

.btn {
  padding: 8px 16px;
  border-radius: 4px;
  border: none;
  cursor: pointer;
  font-size: 14px;
}

.btn-secondary {
  background: var(--tag-filter-item-bg);
  color: var(--modal-text-secondary);
}

.btn-secondary:hover {
  background: var(--tag-filter-item-hover-bg);
}

.btn-primary {
  background: var(--accent);
  color: white;
}

.btn-primary:hover {
  background: var(--accent-hover);
}
</style>