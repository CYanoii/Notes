<script setup>
import { ref, computed } from 'vue'

const props = defineProps({
  modal: { type: Object, required: true }
})

const emit = defineEmits(['close', 'confirm'])

// 预设颜色列表 - 20种清新、易区分的颜色（按色相排序）
const PRESET_COLORS = [
  '#2196F3', // 纯蓝
  '#03A9F4', // 天蓝
  '#00BCD4', // 青色
  '#009688', // 蓝绿
  '#4CAF50', // 绿色
  '#8BC34A', // 草绿
  '#CDDC39', // 柠檬绿
  '#FF9800', // 橙色
  '#FFC107', // 琥珀黄
  '#FFD740', // 金色
  '#FF5722', // 橙红
  '#F44336', // 红色
  '#E91E63', // 玫红
  '#F06292', // 粉色
  '#9C27B0', // 紫色
  '#673AB7', // 靛蓝
  '#3F51B5', // 靛青
  '#795548', // 棕色
  '#607D8B', // 蓝灰
  '#BCAAA4'  // 藕荷
]

// 计算当前选中的颜色
const selectedColor = ref(props.modal.defaultColor || PRESET_COLORS[0])

// 点击颜色圆点
function selectColor(color) {
  selectedColor.value = color
}

// 将颜色分成两排
const firstRowColors = computed(() => PRESET_COLORS.slice(0, 10))
const secondRowColors = computed(() => PRESET_COLORS.slice(10))

const localValue = ref(props.modal.defaultValue || '')

function handleConfirm() {
  const value = localValue.value.trim()
  emit('confirm', props.modal.id, value || null, selectedColor.value)
}

function handleCancel() {
  emit('close', props.modal.id, null)
}
</script>

<template>
  <div class="modal-container">
    <div class="modal-header">
      <h3 class="modal-title">{{ modal.title }}</h3>
      <button class="modal-close-btn" @click="handleCancel">
        <i class="fas fa-times"></i>
      </button>
    </div>
    <div class="modal-body">
      <input
        type="text"
        class="modal-input"
        v-model="localValue"
        :placeholder="modal.defaultValue ? '' : '请输入标签名称'"
        @keydown.enter="handleConfirm"
        @keydown.esc="handleCancel"
      >
      <div class="color-picker">
        <div class="color-row">
          <button
            v-for="color in firstRowColors"
            :key="color"
            class="color-dot"
            :class="{ selected: selectedColor === color }"
            :style="{ backgroundColor: color }"
            @click="selectColor(color)"
          >
            <svg v-if="selectedColor === color" class="check-icon" viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="rgba(255,255,255,0.95)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
          </button>
        </div>
        <div class="color-row">
          <button
            v-for="color in secondRowColors"
            :key="color"
            class="color-dot"
            :class="{ selected: selectedColor === color }"
            :style="{ backgroundColor: color }"
            @click="selectColor(color)"
          >
            <svg v-if="selectedColor === color" class="check-icon" viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="rgba(255,255,255,0.95)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
          </button>
        </div>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-secondary modal-cancel" @click="handleCancel">取消</button>
      <button class="btn btn-primary modal-confirm" @click="handleConfirm">确定</button>
    </div>
  </div>
</template>

<style scoped>
.modal-container {
  background: var(--modal-bg);
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

.modal-input {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid var(--modal-border);
  border-radius: 4px;
  font-size: 14px;
  box-sizing: border-box;
  background: var(--tag-filter-item-bg);
  color: var(--modal-text);
}

.modal-input:focus {
  outline: none;
  border-color: var(--accent);
}

.color-picker {
  margin-top: 16px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.color-row {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: center;
}

.color-dot {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  border: none;
  cursor: pointer;
  transition: transform 0.15s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
}

.color-dot:hover {
  transform: scale(1.15);
}

.check-icon {
  animation: checkBounce 0.15s ease-out;
}

@keyframes checkBounce {
  0% {
    transform: scale(0);
    opacity: 0;
  }
  60% {
    transform: scale(1.2);
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
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
}

.btn-secondary {
  background: var(--tag-filter-item-bg);
  color: var(--modal-text-secondary);
}

.btn-secondary:hover {
  background: var(--tag-filter-item-hover-bg);
}

.btn-primary {
  background: var(--accent);
  color: white;
}

.btn-primary:hover {
  background: var(--accent-hover);
}
</style>
