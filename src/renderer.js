import { App } from './modules/core/App.js';

// 初始化应用
document.addEventListener('DOMContentLoaded', async () => {
    const app = new App();
    await app.init();
});