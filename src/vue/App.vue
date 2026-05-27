<!-- src/vue/App.vue -->
<template>
  <div class="vue-app">
    <!-- 全局 Toast 容器 -->
    <ToastContainer />
    
    <!-- 当前路由或测试页面 -->
    <HomeView />
  </div>
</template>

<script setup>
import ToastContainer from './components/ToastContainer.vue'
import HomeView from './views/HomeView.vue'
</script>