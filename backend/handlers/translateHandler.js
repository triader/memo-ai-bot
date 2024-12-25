export const handleTranslate = (bot, openai) => async (msg, match) => {
  const chatId = msg.chat.id;
  const text = match[1];

  try {
    const completion = await openai.chat.completions.create({
      messages: [
        {
          role: "system",
          content: "You are a helpful language learning assistant. Provide translations, explanations, and usage examples."
        },
        {
          role: "user",
          content: `Translate and explain: ${text}`
        }
      ],
      model: "gpt-3.5-turbo",
    });

    const response = completion.choices[0].message.content;
    await bot.sendMessage(chatId, response);
  } catch (error) {
    await bot.sendMessage(chatId, '❌ Translation failed. Please try again.');
    console.error(error);
  }
};