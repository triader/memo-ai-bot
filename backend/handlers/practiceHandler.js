import { generateSentence } from '../utils/openai.js';
import { updateWordProgress } from './wordProgressHandler.js';
import { mainKeyboard, cancelKeyboard } from '../utils/keyboards.js';

// Store practice states
export const practiceStates = new Map();

export const handlePractice = (bot, supabase, userSettingsService) => {
  return async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const text = msg.text;

    console.log('Practice message:', { chatId, text });
    console.log('Current practice state:', practiceStates.get(chatId));

    try {
      // Handle cancel command
      if (text === '❌ Cancel') {
        practiceStates.delete(chatId);
        await bot.sendMessage(chatId, 'Practice cancelled.', mainKeyboard);
        return;
      }

      // Handle initial command
      if (text === '/practice' || text === '🎯 Practice') {
        const currentCategory = await userSettingsService.getCurrentCategory(userId);

        if (!currentCategory) {
          await bot.sendMessage(chatId, 'You need to add some words first!', mainKeyboard);
          return;
        }

        // Get words for practice
        const { data: words, error } = await supabase
          .from('words')
          .select('*')
          .eq('user_id', userId)
          .eq('category_id', currentCategory.id)
          .lt('mastery_level', 90)
          .order('last_practiced', { ascending: true })
          .limit(5);

        if (error) throw error;

        if (!words?.length) {
          await bot.sendMessage(
            chatId,
            `No words to practice in category "${currentCategory.name}"! All words are well learned or you need to add new ones.`,
            mainKeyboard
          );
          return;
        }

        // Select a word and practice type
        const word = words[Math.floor(Math.random() * words.length)];
        const practiceType = ['translate', 'multiple_choice', 'fill_blank'][
          Math.floor(Math.random() * 3)
        ];

        practiceStates.set(chatId, {
          wordId: word.id,
          word: word.word,
          correctAnswer: word.translation,
          practiceType,
          isWaitingForAnswer: true
        });
        console.log('Set practice state:', practiceStates.get(chatId));

        // Send practice question
        switch (practiceType) {
          case 'translate':
            await bot.sendMessage(
              chatId,
              `[${currentCategory.name}] Translate this word: ${word.word}`,
              cancelKeyboard
            );
            break;

          case 'multiple_choice':
            const options = words
              .map((w) => w.translation)
              .sort(() => Math.random() - 0.5)
              .slice(0, 4);

            if (!options.includes(word.translation)) {
              options[3] = word.translation;
            }

            await bot.sendMessage(
              chatId,
              `[${currentCategory.name}] Choose the correct translation for: ${word.word}`,
              {
                reply_markup: {
                  keyboard: options.map((option) => [{ text: option }]),
                  one_time_keyboard: true,
                  resize_keyboard: true
                }
              }
            );
            break;

          case 'fill_blank':
            const sentence = await generateSentence(word.word, word.translation);
            await bot.sendMessage(chatId, `[${currentCategory.name}]\n${sentence}`, cancelKeyboard);
            break;
        }
        return;
      }

      // Handle answer
      const state = practiceStates.get(chatId);
      console.log('Retrieved state for answer:', state);

      if (!state || !state.isWaitingForAnswer) {
        console.log('No valid state for answer');
        return;
      }

      // Check answer
      const answer = text.trim().toLowerCase();
      const correctAnswer = state.correctAnswer.toLowerCase();
      console.log('Checking answer:', { answer, correctAnswer, type: state.practiceType });

      let isCorrect = false;

      switch (state.practiceType) {
        case 'translate':
        case 'fill_blank':
          isCorrect = answer === correctAnswer;
          break;
        case 'multiple_choice':
          isCorrect = answer === correctAnswer;
          break;
      }

      console.log('Answer check result:', isCorrect);

      // Send feedback and update progress
      await bot.sendMessage(
        chatId,
        isCorrect ? '✅ Correct!' : `❌ Wrong. The correct answer is: ${state.correctAnswer}`,
        mainKeyboard
      );

      // Update word progress
      if (state.wordId) {
        await updateWordProgress(supabase, state.wordId, isCorrect);
      }

      practiceStates.delete(chatId);
      console.log('State cleared after answer');
    } catch (error) {
      console.error('Practice error:', error);
      await bot.sendMessage(
        chatId,
        '❌ Failed to process practice. Please try again.',
        mainKeyboard
      );
      practiceStates.delete(chatId);
    }
  };
};
