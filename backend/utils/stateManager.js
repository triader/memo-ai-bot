const userStates = new Map();

export const StateManager = {
  get: (chatId) => {
    const state = userStates.get(chatId);
    console.log(`Getting state for chat ${chatId}:`, state);
    return state;
  },

  set: (chatId, state) => {
    console.log(`Setting state for chat ${chatId}:`, state);
    return userStates.set(chatId, state);
  },

  delete: (chatId) => {
    console.log(`Deleting state for chat ${chatId}`);
    return userStates.delete(chatId);
  },

  setState: (chatId, step, data = {}) => {
    const state = { step, ...data };
    console.log(`Setting state for chat ${chatId}:`, state);
    userStates.set(chatId, state);
  }
};
