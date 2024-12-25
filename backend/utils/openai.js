import { openai } from '../config/openai.js';

export const generateSentence = async (word, translation) => {
  try {
    const completion = await openai.chat.completions.create({
      messages: [
        {
          role: "system",
          content: "You are a language learning assistant. Generate a simple, clear sentence using the given word. The sentence should help learners understand the word's usage in context."
        },
        {
          role: "user",
          content: `Generate a simple sentence using the word "${word}" (which means "${translation}"). Replace the word with "___" in the sentence. The sentence should clearly demonstrate the word's meaning.`
        }
      ],
      model: "gpt-3.5-turbo",
    });

    return completion.choices[0].message.content;
  } catch (error) {
    console.error('Error generating sentence:', error);
    return `Complete the sentence: "_____ means ${translation}"`;
  }
};