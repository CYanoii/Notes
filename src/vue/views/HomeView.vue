<script setup>
import { useToast } from '../composables/useToast.js'

const { show_success, show_error, show_warning, show_info, show } = useToast()

function testSuccess() {
  show_success('操作成功！')
}

function testError() {
  show_error('出错了！')
}

function testWarning() {
  show_warning('警告信息')
}

function testInfo() {
  show_info('普通提示')
}

function testCustom() {
  show('自定义消息', 'error', 5000)
}
</script>

<template>
  <div class="vue-test-container">
    <h1>Vue 环境测试</h1>
    <p>如果能看到 Toast 提示，说明 Vue + Vite 环境配置成功！</p>

    <div class="btn-group">
      <button @click="testSuccess">Success</button>
      <button @click="testError">Error</button>
      <button @click="testWarning">Warning</button>
      <button @click="testInfo">Info</button>
      <button @click="testCustom">Custom (5s)</button>
    </div>
  </div>
</template>

<style scoped>
.vue-test-container {
  padding: 40px;
  text-align: center;
}

.btn-group {
  display: flex;
  gap: 10px;
  justify-content: center;
  margin-top: 20px;
}

button {
  padding: 10px 20px;
  border: none;
  border-radius: 4px;
  background: #4a90d9;
  color: white;
  cursor: pointer;
}

button:hover {
  background: #357abd;
}
</style>