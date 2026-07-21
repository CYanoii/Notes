<script setup>
import { ref } from 'vue'

const props = defineProps({
  modal: { type: Object, required: true }
})

const emit = defineEmits(['close', 'confirm'])

const localVersionNote = ref('')

function handlePublish() {
  emit('confirm', props.modal.id, 'publish', localVersionNote.value)
}

function handleDiscard() {
  emit('confirm', props.modal.id, 'discard', null)
}

function handleCancel() {
  emit('close', props.modal.id, null)
}
</script>

<template>
  <div class="modal-container">
    <div class="modal-header">
      <h3 class="modal-title">发布笔记</h3>
      <button class="modal-close-btn" @click="handleCancel">
        <i class="fas fa-times"></i>
      </button>
    </div>
    <div class="modal-body">
      <p class="modal-info">
        将创建版本 <span class="version-badge">v{{ modal.nextVersion }}</span> 的快照
      </p>
      <textarea
        class="version-note-input"
        v-model="localVersionNote"
        placeholder="输入版本说明（可选）..."
        rows="3"
      ></textarea>
    </div>
    <div class="modal-footer">
      <button class="btn btn-secondary modal-cancel" @click="handleCancel">取消</button>
      <button
        class="btn btn-secondary modal-discard"
        :disabled="!modal.hasHistory"
        :title="modal.hasHistory ? '放弃当前修改，恢复到最新发布版本' : '暂无历史版本'"
        @click="handleDiscard"
      >
        放弃
      </button>
      <button class="btn btn-primary modal-publish" @click="handlePublish">发布</button>
    </div>
  </div>
</template>

<style scoped>
.modal-container {
  background: var(--modal-bg);
  border-radius: 8px;
  min-width: 420px;
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

.modal-info {
  margin: 0 0 12px 0;
  font-size: 14px;
  color: var(--modal-text-secondary);
}

.version-badge {
  display: inline-block;
  background: var(--accent);
  color: white;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
}

.version-note-input {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid var(--modal-border);
  border-radius: 4px;
  font-size: 14px;
  font-family: inherit;
  resize: vertical;
  box-sizing: border-box;
  background: var(--tag-filter-item-bg);
  color: var(--modal-text);
}

.version-note-input:focus {
  outline: none;
  border-color: var(--accent);
}

.version-note-input::placeholder {
  color: var(--modal-text-secondary);
  opacity: 0.7;
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
  transition: background-color 0.15s ease;
}

.btn-secondary {
  background: var(--tag-filter-item-bg);
  color: var(--modal-text-secondary);
}

.btn-secondary:hover:not(:disabled) {
  background: var(--tag-filter-item-hover-bg);
}

.btn-primary {
  background: var(--accent);
  color: white;
}

.btn-primary:hover {
  background: var(--accent-hover);
}

.modal-discard {
  background: var(--info-bg, #e3f2fd);
  color: var(--info-text, #1976d2);
}

.modal-discard:hover:not(:disabled) {
  background: var(--info-hover-bg, #bbdefb);
}

.modal-discard:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.btn-secondary.modal-cancel {
  background: var(--tag-filter-item-bg);
  color: var(--modal-text-secondary);
}
</style>
