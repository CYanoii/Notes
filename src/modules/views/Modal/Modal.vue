<script setup>
import PromptModal from './types/PromptModal.vue'
import ConfirmModal from './types/ConfirmModal.vue'
import TagSelectionModal from './types/TagSelectionModal.vue'
import SettingsModal from './types/SettingsModal.vue'

const props = defineProps({
  modal: { type: Object, required: true }
})

const emit = defineEmits(['close', 'confirm', 'tagToggle', 'updatePath', 'selectFolder', 'clearPath'])

function handleOverlayClick(e) {
  if (e.target === e.currentTarget) {
    emit('close', props.modal.id)
  }
}
</script>

<template>
  <Teleport to="body">
    <div class="modal-overlay" @click="handleOverlayClick">
      <PromptModal
        v-if="modal.type === 'prompt'"
        :modal="modal"
        @close="(id) => emit('close', id)"
        @confirm="(id, val) => emit('confirm', id, val)"
      />
      <ConfirmModal
        v-else-if="modal.type === 'confirm'"
        :modal="modal"
        @close="(id) => emit('close', id)"
        @confirm="(id, val) => emit('confirm', id, val)"
      />
      <TagSelectionModal
        v-else-if="modal.type === 'tagSelection'"
        :modal="modal"
        @close="(id) => emit('close', id)"
        @confirm="(id, val) => emit('confirm', id, val)"
        @tagToggle="(id, tagId) => emit('tagToggle', id, tagId)"
      />
      <SettingsModal
        v-else-if="modal.type === 'settings'"
        :modal="modal"
        @close="(id) => emit('close', id)"
        @updatePath="(id, path) => emit('updatePath', id, path)"
        @selectFolder="(id) => emit('selectFolder', id)"
        @clearPath="(id) => emit('clearPath', id)"
      />
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
</style>