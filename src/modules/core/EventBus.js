/**
 * 事件总线
 * 实现模块间的松耦合通信
 * 通过依赖注入注入到各个模块，由 App 统一创建实例
 */
export class EventBus {
    constructor() {
        this.events = new Map();
    }

    /**
     * 订阅事件
     * @param {string} eventName 事件名称
     * @param {Function} callback 回调函数
     */
    on(eventName, callback) {
        if (!this.events.has(eventName)) {
            this.events.set(eventName, []);
        }
        this.events.get(eventName).push(callback);
    }

    /**
     * 取消订阅
     * @param {string} eventName 事件名称
     * @param {Function} callback 回调函数
     */
    off(eventName, callback) {
        if (!this.events.has(eventName)) return;

        const callbacks = this.events.get(eventName);
        const index = callbacks.indexOf(callback);
        if (index !== -1) {
            callbacks.splice(index, 1);
        }
    }

    /**
     * 发布事件
     * @param {string} eventName 事件名称
     * @param  {...any} data 事件数据
     */
    emit(eventName, ...data) {
        if (!this.events.has(eventName)) return;

        this.events.get(eventName).forEach(callback => {
            callback(...data);
        });
    }

    /**
     * 只订阅一次
     * @param {string} eventName 事件名称
     * @param {Function} callback 回调函数
     */
    once(eventName, callback) {
        const onceCallback = (...data) => {
            callback(...data);
            this.off(eventName, onceCallback);
        };
        this.on(eventName, onceCallback);
    }

    /**
     * 清除所有事件
     */
    clear() {
        this.events.clear();
    }
}
