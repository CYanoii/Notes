<script setup>
import { useModal } from '../composables/useModal.js'
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

function handleTagToggle(id, tagId) {
  toggleTagSelection(id, tagId)
}

function handleUpdatePath(id, path) {
  updateSettingsPath(id, path)
}
</script>

<template>
  <Modal
    v-for="modal in modals"
    :key="modal.id"
    :modal="modal"
    @close="handleClose"
    @tagToggle="handleTagToggle"
    @updatePath="handleUpdatePath"
  />
</template>