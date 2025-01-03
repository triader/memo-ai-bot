export const BotState = {
  IDLE: 'IDLE',
  ADDING_WORD: 'ADDING_WORD',
  PRACTICING: 'PRACTICING',
  EDITING_WORD: 'EDITING_WORD',
  IMPORTING: 'IMPORTING',
  EDITING_CATEGORY: 'EDITING_CATEGORY',
  DELETING_CATEGORY: 'DELETING_CATEGORY'
};

class StateManager {
  constructor() {
    this.state = BotState.IDLE;
  }

  setState(state) {
    this.state = state;
  }

  getState() {
    return this.state;
  }

  clearState() {
    this.state = BotState.IDLE;
  }
}

// Export singleton instance
export const stateManager = new StateManager();
