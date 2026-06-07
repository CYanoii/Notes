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