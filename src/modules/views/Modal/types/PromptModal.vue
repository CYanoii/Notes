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
</style>