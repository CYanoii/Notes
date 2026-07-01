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
    @confirm="handleConfirm"
    @tagToggle="handleTagToggle"
    @updatePath="handleUpdatePath"
    @select="handleSelect"
  />
</template>