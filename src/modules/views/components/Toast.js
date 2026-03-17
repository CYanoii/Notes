/**
 * Toast 提示组件
 * 负责显示轻量级提示消息
 */
export class Toast {
    constructor() {
        // 不再需要内部绑定事件，由 UIManager 统一绑定
    }

    /**
     * 显示Toast提示
     * @param {string} message 提示内容
     * @param {string} type 提示类型：info/success/error/warning
     */
    show(message, type = 'info') {
        // 创建toast元素
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;

        const iconMap = {
            success: 'check-circle',
            error: 'exclamation-circle',
            warning: 'exclamation-triangle',
            info: 'info-circle'
        };

        toast.innerHTML = `
            <i class="fas fa-${iconMap[type] || iconMap.info}"></i>
            <span>${message}</span>
        `;

        // 添加到页面
        document.body.appendChild(toast);

        // 显示动画
        setTimeout(() => toast.classList.add('show'), 10);

        // 3秒后自动消失
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }
}
