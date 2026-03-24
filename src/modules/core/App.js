/**
 * 主应用入口 - 依赖注入中心
 * 负责创建所有模块实例并注入依赖，然后启动应用
 */
import { EventBus } from './EventBus.js';
import { NoteController } from '../controllers/NoteController.js';
import { TagController } from '../controllers/TagController.js';
import { NoteService } from '../services/NoteService.js';
import { TagService } from '../services/TagService.js';
import { NoteTagCoordinator } from '../coordinators/NoteTagCoordinator.js';
import { UIManager } from '../views/UIManager.js';
import { EventTypes } from './EventTypes.js';

export class App {
    constructor() {
        // 1. 创建核心实例（唯一）
        this.eventBus = new EventBus();

        // 2. 创建数据服务层（依赖 EventBus）
        this.noteService = new NoteService(this.eventBus);
        this.tagService = new TagService(this.eventBus);

        // 3. 创建 UI 管理器，由它统一创建和管理所有 UI 组件
        this.uiManager = new UIManager(this.eventBus);

        // 4. 创建控制器层（依赖下层模块 + EventBus）
        // 由于存在循环依赖，先创建 NoteController，再创建其他，最后设置引用
        this.noteController = new NoteController(
            this.noteService,
            this.tagService,
            this.uiManager,
            this.eventBus
        );

        // 创建标签控制器和笔记-标签协调器
        // 注意：这里需要先创建标签控制器占位，由于协调器依赖标签控制器，标签控制器也依赖协调器
        this.tagController = new TagController(
            this.tagService,
            this.uiManager,
            this.eventBus,
            null // 先占位，noteTagCoordinator 创建后再注入
        );

        this.noteTagCoordinator = new NoteTagCoordinator(
            this.noteService,
            this.tagService,
            this.uiManager,
            this.eventBus,
            this.noteController,
            this.tagController
        );

        // 补全依赖
        this.tagController.noteTagCoordinator = this.noteTagCoordinator;
        this.noteController.setTagController(this.tagController);
        this.noteController.setNoteTagCoordinator(this.noteTagCoordinator);

        // 暴露到全局方便调试
        this.exposeToGlobal();

        console.log('App initialized with all modules');
    }

    /**
     * 初始化应用
     */
    async init() {
        this.eventBus.emit(EventTypes.APP.INIT);
        console.log('App started');
    }

    /**
     * 暴露到全局，方便调试
     */
    exposeToGlobal() {
        window.app = this;
        window.eventBus = this.eventBus;
    }
}
