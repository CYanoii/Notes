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

        // 2. 创建数据服务层
        this.noteService = new NoteService();
        this.tagService = new TagService();

        // 3. 创建 UI 管理器，由它统一创建和管理所有 UI 组件
        this.uiManager = new UIManager(this.eventBus);

        // 4. 创建协调器层（仅依赖服务层，不依赖控制器，消除循环依赖）
        this.noteTagCoordinator = new NoteTagCoordinator(
            this.noteService,
            this.tagService,
            this.uiManager
        );

        // 5. 创建控制器层（依赖下层模块 + 协调器）
        this.noteController = new NoteController(
            this.noteService,
            this.uiManager,
            this.eventBus,
            this.noteTagCoordinator
        );

        // 创建标签控制器，协调器已创建好直接注入
        this.tagController = new TagController(
            this.tagService,
            this.uiManager,
            this.eventBus,
            this.noteTagCoordinator
        );

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
