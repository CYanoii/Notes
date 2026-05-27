<script setup>
import { useToast } from '../composables/useToast.js'
import Toast from './Toast.vue'

const { toasts, close } = useToast()
</script>

<template>
  <Teleport to="body">
    <div class="toast-container">
      <Toast
        v-for="(toast, index) in toasts"
        :key="toast.id"
        :message="toast.message"
        :type="toast.type"
        :show="toast.show"
        :style="{ top: (60 + index * 55) + 'px' }"
        @click="close(toast.id)"
      />
    </div>
  </Teleport>
</template>

<style scoped>
.toast-container {
  position: fixed;
  top: 0;
  right: 20px;
  z-index: 9999;
}
</style>