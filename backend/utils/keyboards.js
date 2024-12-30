export const mainKeyboard = {
  reply_markup: {
    keyboard: [
      [{ text: '📝 Add Word' }, { text: '📚 My Words' }],
      [{ text: '🎯 Practice' }, { text: '🔄 Change Category' }],
      [{ text: '⚙️ More options' }]
    ],
    resize_keyboard: true
  }
};

if (process.env.ENVIRONMENT === 'development') {
  mainKeyboard.reply_markup.keyboard.push([{ text: 'This is DEV' }]);
}

export const mainKeyboardSecondary = {
  reply_markup: {
    keyboard: [
      [{ text: '✏️ Edit word' }, { text: '🗑️ Delete word' }],
      [{ text: '📥 Import' }],
      [{ text: '◀️ Back to main' }]
    ],
    resize_keyboard: true
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
