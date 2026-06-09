<script setup>
import { ref, onMounted } from 'vue'

const folderName = ref('CYanote')

onMounted(async () => {
  try {
    const name = await window.electronAPI.getFolderName()
    if (name) {
      folderName.value = name
    }
  } catch (e) {
    console.warn('[TitleBar] 获取文件夹名失败:', e)
  }
})

function handleMinimize() {
  window.electronAPI.minimizeWindow()
}

async function handleMaximize() {
  await window.electronAPI.maximizeWindow()
  updateMaximizeIcon()
}

function handleClose() {
  window.electronAPI.closeWindow()
}

const isMaximized = ref(false)

async function updateMaximizeIcon() {
  isMaximized.value = await window.electronAPI.isWindowMaximized()
}
</script>

<template>
  <div class="titlebar">
    <div class="titlebar-left">
      <span class="titlebar-icon"></span>
      <span class="titlebar-title">CYanote - {{ folderName }}</span>
    </div>
    <div class="titlebar-controls">
      <button class="titlebar-btn minimize" @click="handleMinimize">
        <i class="fas fa-minus"></i>
      </button>
      <button class="titlebar-btn maximize" @click="handleMaximize">
        <i :class="isMaximized ? 'far fa-clone' : 'far fa-square'"></i>
      </button>
      <button class="titlebar-btn close" @click="handleClose">
        <i class="fas fa-times"></i>
      </button>
    </div>
  </div>
</template>

<style scoped>
/* 标题栏样式 - 从 titlebar.css 移入 */
.titlebar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 32px;
  background: var(--titlebar-bg);
  color: var(--titlebar-color);
  -webkit-app-region: drag;
  user-select: none;
}

.titlebar-left {
  display: flex;
  align-items: center;
  gap: 8px;
  padding-left: 12px;
}

.titlebar-icon {
  width: 16px;
  height: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: url('../../../../icon.ico') center/contain no-repeat;
}

.titlebar-icon i {
  display: none;
}

.titlebar-title {
  font-size: 13px;
  font-weight: 500;
  letter-spacing: 0.5px;
}

.titlebar-controls {
  display: flex;
  height: 100%;
  -webkit-app-region: no-drag;
}

.titlebar-btn {
  width: 46px;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  color: var(--titlebar-color);
  cursor: pointer;
  transition: background 0.15s;
}

.titlebar-btn:hover {
  background: rgba(255, 255, 255, 0.1);
}

.titlebar-btn.close:hover {
  background: #e53e3e;
}

.titlebar-btn i {
  font-size: 12px;
}

.titlebar-btn.maximize i {
  font-size: 11px;
}
</style>