<script setup>
const props = defineProps({
  modal: { type: Object, required: true }
})

const emit = defineEmits(['close', 'select'])

function handleSelect(type) {
  emit('select', props.modal.id, type)
}

function handleCancel() {
  emit('close', props.modal.id, null)
}
</script>

<template>
  <div class="modal-container">
    <div class="modal-header">
      <h3 class="modal-title">选择页面类型</h3>
      <button class="modal-close-btn" @click="handleCancel">
        <i class="fas fa-times"></i>
      </button>
    </div>
    <div class="modal-body">
      <div class="page-type-options">
        <button class="page-type-option" @click="handleSelect('note')">
          <i class="fas fa-file-alt"></i>
          <span class="option-title">笔记页</span>
          <span class="option-desc">支持 Markdown 编辑、引用链接</span>
        </button>
        <button class="page-type-option" @click="handleSelect('sticky')">
          <i class="fas fa-sticky-note"></i>
          <span class="option-title">便签页</span>
          <span class="option-desc">简洁便签，适合快速记录</span>
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.modal-container {
  background: var(--modal-bg);
  border-radius: 8px;
  min-width: 480px;
  max-width: 560px;
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

.page-type-options {
  display: flex;
  gap: 16px;
}

.page-type-option {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 24px 16px;
  border: 2px solid var(--modal-border);
  border-radius: 8px;
  background: var(--modal-bg);
  cursor: pointer;
  transition: all 0.2s;
}

.page-type-option:hover {
  border-color: var(--accent);
}

.page-type-option i {
  font-size: 32px;
  color: var(--accent);
  margin-bottom: 12px;
}

.page-type-option .option-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--modal-text);
  margin-bottom: 4px;
}

.page-type-option .option-desc {
  font-size: 12px;
  color: var(--modal-text-secondary);
  text-align: center;
}
</style>
