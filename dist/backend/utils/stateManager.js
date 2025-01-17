"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.stateManager = exports.BotState = void 0;
exports.BotState = {
    IDLE: 'IDLE',
    ADDING_WORD: 'ADDING_WORD',
    PRACTICING: 'PRACTICING',
    EDITING_WORD: 'EDITING_WORD',
    IMPORTING: 'IMPORTING',
    CREATING_CATEGORY: 'CREATING_CATEGORY',
    EDITING_CATEGORY: 'EDITING_CATEGORY',
    DELETING_CATEGORY: 'DELETING_CATEGORY',
    SETTING_ORIGINAL_CONTEXT: 'SETTING_ORIGINAL_CONTEXT',
    SETTING_LEARNING_CONTEXT: 'SETTING_LEARNING_CONTEXT'
};
class StateManager {
    constructor() {
        this.state = exports.BotState.IDLE;
    }
    setState(state) {
        this.state = state;
    }
    getState() {
        return this.state;
    }
    clearState() {
        this.state = exports.BotState.IDLE;
    }
}
exports.stateManager = new StateManager();
//# sourceMappingURL=stateManager.js.map