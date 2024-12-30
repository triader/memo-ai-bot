import { BotState, stateManager } from '../utils/stateManager.js';

export function translateHandler(bot, openai) {
  return async (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;

    if (stateManager.getState() === BotState.IDLE && text) {
      try {
        const completion = await openai.chat.completions.create({
          messages: [
            {
              role: 'system',
              content:
                'You are a helpful language learning assistant. Provide translations, explanations, and usage examples.'
            },
            {
              role: 'user',
              content: `Translate and explain: ${text}`
            }
          ],
          model: 'gpt-4o'
        });

        const response = completion.choices[0].message.content;
        await bot.sendMessage(chatId, response);
      } catch (error) {
        await bot.sendMessage(chatId, '❌ Translation failed. Please try again.');
        console.error(error);
      }
    }
  };
}
