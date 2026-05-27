/**
 * useToast - Toast 提示的组合式函数
 */
import { reactive } from 'vue'

const state = reactive({
  toasts: [],
  toastId: 0
})

export function useToast() {
  function removeToast(id) {
    const index = state.toasts.findIndex(t => t.id === id)
    if (index !== -1) state.toasts.splice(index, 1)
  }

  function close(id) {
    const toast = state.toasts.find(t => t.id === id)
    if (toast) {
      toast.show = false
      setTimeout(() => removeToast(id), 300)
    }
  }

  function show(message, type = 'info', duration = 3000) {
    const id = ++state.toastId
    state.toasts.push({ id, message, type, show: true })
    setTimeout(() => close(id), duration)
  }

  return {
    toasts: state.toasts,
    show,
    show_success: (msg, d) => show(msg, 'success', d),
    show_error: (msg, d) => show(msg, 'error', d),
    show_warning: (msg, d) => show(msg, 'warning', d),
    show_info: (msg, d) => show(msg, 'info', d),
    close
  }
}