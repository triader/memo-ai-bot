export const BotState = {
  IDLE: 'IDLE',
  ADDING_WORD: 'ADDING_WORD',
  PRACTICING: 'PRACTICING',
  CHANGING_CATEGORY: 'CHANGING_CATEGORY',
  DELETING_WORD: 'DELETING_WORD',
  EDITING_WORD: 'EDITING_WORD',
  IMPORTING: 'IMPORTING'
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
