export const mainKeyboard = {
  reply_markup: {
    keyboard: [
      [{ text: '📝 Add Word' }, { text: '🎯 Practice' }],
      [{ text: '📚 My Words' }, { text: '📥 Import' }],
      [{ text: '🔄 Change Category' }, { text: '✏️ Edit word' }]
    ],
    resize_keyboard: true,
    persistent: true
  }
};

export const cancelKeyboard = {
  reply_markup: {
    keyboard: [[{ text: '❌ Cancel' }]],
    resize_keyboard: true,
    one_time_keyboard: true
  }
};

export const removeKeyboard = {
  reply_markup: {
    remove_keyboard: true
  }
};

export const createWordActionsKeyboard = (wordId) => ({
  reply_markup: {
    inline_keyboard: [
      [
        { text: '✏️ Edit', callback_data: `edit_${wordId}` },
        { text: '🗑️ Delete', callback_data: `delete_${wordId}` }
      ]
    ]
  }
});
