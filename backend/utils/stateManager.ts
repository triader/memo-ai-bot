export const BotState = {
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
} as const;

type BotStateType = keyof typeof BotState;

class StateManager {
  private state: BotStateType;
  constructor() {
    this.state = BotState.IDLE;
  }

  setState(state: BotStateType) {
    this.state = state;
  }

  getState() {
    return this.state;
  }

  clearState() {
    this.state = BotState.IDLE;
  }
}

export const stateManager = new StateManager();
