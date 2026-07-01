/**
 * 通用帮助函数
 * 防抖、HTML转义等
 */

/**
 * HTML转义，防止XSS
 * @param {string} text 待转义的文本
 * @returns {string} 转义后的文本
 */
export function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * 防抖函数
 * @param {Function} func 要防抖的函数
 * @param {number} delay 延迟时间（毫秒）
 * @returns {Function} 防抖后的函数
 */
export function debounce(func, delay) {
    let timeoutId;
    return function(...args) {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => func.apply(this, args), delay);
    };
}

/**
 * 根据页面类型获取图标类名
 * @param {string} pageType 页面类型 ('note' | 'sticky')
 * @returns {string} FontAwesome 图标类名
 */
export function getPageIcon(pageType) {
    return pageType === 'sticky' ? 'fas fa-sticky-note' : 'fas fa-file-alt';
}
