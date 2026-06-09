<script setup>
import { ref, watch } from 'vue'

const props = defineProps({
  message: String,
  type: { type: String, default: 'info' },
  show: Boolean
})

const isShown = ref(false)

watch(() => props.show, (newVal) => {
  if (newVal) {
    setTimeout(() => { isShown.value = true }, 10)
  } else {
    isShown.value = false
  }
}, { immediate: true })

const iconMap = {
  success: 'fa-check-circle',
  error: 'fa-exclamation-circle',
  warning: 'fa-exclamation-triangle',
  info: 'fa-info-circle'
}
</script>

<template>
  <div class="toast" :class="[`toast-${type}`, { 'show': isShown }]">
    <i class="fas" :class="iconMap[type]"></i>
    <span>{{ message }}</span>
  </div>
</template>

<style scoped>
.toast {
  position: fixed;
  right: 20px;
  background: var(--toast-bg);
  color: var(--toast-text);
  padding: 12px 20px;
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0,0,0,0.15);
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 14px;
  z-index: 9999;
  opacity: 0;
  transform: translateX(calc(100vw + 100%));
  transition: opacity 0.3s, transform 0.3s;
}
.toast.show {
  opacity: 1;
  transform: translateX(0);
}
.toast-success { border-left: 4px solid var(--toast-success-color); }
.toast-success i { color: var(--toast-success-color); }
.toast-error { border-left: 4px solid var(--toast-error-color); }
.toast-error i { color: var(--toast-error-color); }
.toast-warning { border-left: 4px solid var(--toast-warning-color); }
.toast-warning i { color: var(--toast-warning-color); }
.toast-info { border-left: 4px solid var(--toast-info-color); }
.toast-info i { color: var(--toast-info-color); }
</style>