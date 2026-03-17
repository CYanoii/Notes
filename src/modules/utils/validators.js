/**
 * 数据验证工具函数
 * 验证输入数据合法性
 */

/**
 * 验证笔记数据是否有效
 * @param {Object} note 笔记数据
 * @returns {boolean} 是否有效
 */
export function validateNote(note) {
    if (!note || typeof note !== 'object') {
        return false;
    }
    // 标题可以为空（显示无标题），但必须存在
    if (note.title === undefined) {
        return false;
    }
    return true;
}

/**
 * 验证笔记ID是否有效
 * @param {string|number} noteId 笔记ID
 * @returns {boolean} 是否有效
 */
export function validateNoteId(noteId) {
    return noteId !== null && noteId !== undefined && noteId !== '';
}

/**
 * 验证搜索关键词
 * @param {string} query 搜索关键词
 * @returns {boolean} 是否有效
 */
export function validateSearchQuery(query) {
    return typeof query === 'string' && query.trim().length > 0;
}
