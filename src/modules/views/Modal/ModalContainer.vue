<script setup>
import { useModal } from './useModal.js'
import Modal from './Modal.vue'

const {
  modals,
  close,
  toggleTagSelection,
  updateSettingsPath
} = useModal()

function handleClose(id, result) {
  close(id, result)
}

function handleConfirm(id, result, color) {
  close(id, { value: result, color })
}

function handlePublishConfirm(id, action, versionNote) {
  close(id, { action, versionNote })
}

function handleTagToggle(id, tagId) {
  toggleTagSelection(id, tagId)
}

function handleUpdatePath(id, path) {
  updateSettingsPath(id, path)
}

function handleSelect(id, type) {
  close(id, type)
}
</script>

<template>
  <Modal
    v-for="modal in modals"
    :key="modal.id"
    :modal="modal"
    @close="handleClose"
    @confirm="(id, result, color) => modal.type === 'publishOrDiscard' ? handlePublishConfirm(id, result, color) : handleConfirm(id, result, color)"
    @tagToggle="handleTagToggle"
    @updatePath="handleUpdatePath"
    @select="handleSelect"
  />
</template>