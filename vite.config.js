// vite.config.js
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

export default defineConfig({
  plugins: [vue()],
  root: './src',               // index.html 在 src/ 下
  base: './',                  // 相对路径，适合 Electron
  build: {
    outDir: '../dist_vue',         // 输出位置
    emptyOutDir: true,
    rollupOptions: {
      input: {
        // 打包入口
        main: resolve(__dirname, 'src/index.html'),
      },
      output: {
        // 固定输出文件名，方便 index.html 引用
        entryFileNames: 'assets/[name].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name].[ext]'
      }
    }
  },
  server: {
    port: 5173,
    strictPort: true,
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    }
  }
})