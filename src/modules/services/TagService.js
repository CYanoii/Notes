/**
 * 标签数据服务
 * 封装所有与 Electron API 的交互，实现数据层与业务层分离
 */
export class TagService {
	constructor() {
	}

	/**
	 * 获取所有标签列表
	 * @returns {Promise<Array>} 标签列表
	 */
	async getAllTags() {
		return await window.electronAPI.getAllTags();
	}

	/**
	 * 获取单个标签详情
	 * @param {string} tagId 标签ID
	 * @returns {Promise<Object>} 标签详情
	 */
	async getTag(tagId) {
		// 由于 getAllTags 已经返回完整数据，通常不需要单独获取
		const tags = await this.getAllTags();
		return tags.find(tag => tag.id === tagId);
	}

	/**
	 * 创建新标签
	 * @param {string} name 标签名称
	 * @param {string} color 标签颜色（可选）
	 * @returns {Promise<Object>} 新创建的标签
	 */
	async createTag(name, color = null) {
		return await window.electronAPI.createTag(name, color);
	}

	/**
	 * 更新标签
	 * @param {string} tagId 标签ID
	 * @param {Object} updates 要更新的标签数据
	 * @returns {Promise<Object>} 更新后的标签
	 */
	async updateTag(tagId, updates) {
		return await window.electronAPI.updateTag(tagId, updates);
	}

	/**
	 * 删除标签
	 * @param {string} tagId 标签ID
	 * @returns {Promise<boolean>}
	 */
	async deleteTag(tagId) {
		return await window.electronAPI.deleteTag(tagId);
	}

}
