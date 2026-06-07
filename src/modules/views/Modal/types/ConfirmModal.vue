<script setup>
const props = defineProps({
  modal: { type: Object, required: true }
})

const emit = defineEmits(['close', 'confirm'])

function handleConfirm() {
  emit('confirm', props.modal.id, true)
}

function handleCancel() {
  emit('close', props.modal.id, null)
}
</script>

<template>
  <div class="modal-container">
    <div class="modal-header">
      <h3 class="modal-title">确认删除</h3>
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

.btn-danger {
  background: #e53e3e;
  color: white;
}

.btn-danger:hover {
  background: #c53030;
}
</style>