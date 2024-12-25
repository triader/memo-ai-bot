export const updateWordProgress = async (supabase, wordId, isCorrect) => {
  try {
    // First get current word stats
    const { data: word, error: fetchError } = await supabase
      .from('words')
      .select('correct_answers, incorrect_answers, mastery_level')
      .eq('id', wordId)
      .single();

    if (fetchError) throw fetchError;

    // Calculate new stats
    const correctAnswers = (word.correct_answers || 0) + (isCorrect ? 1 : 0);
    const incorrectAnswers = (word.incorrect_answers || 0) + (isCorrect ? 0 : 1);

    // Calculate new mastery level
    let masteryLevel = word.mastery_level || 0;
    if (isCorrect) {
      // Increase by 10% for correct answer, cap at 100%
      masteryLevel = Math.min(100, masteryLevel + 10);
    }

    // Update the word with new stats
    const { error: updateError } = await supabase
      .from('words')
      .update({
        correct_answers: correctAnswers,
        incorrect_answers: incorrectAnswers,
        mastery_level: masteryLevel,
        last_practiced: new Date().toISOString()
      })
      .eq('id', wordId);

    if (updateError) throw updateError;

    return { correctAnswers, incorrectAnswers, masteryLevel };
  } catch (error) {
    console.error('Error updating word progress:', error);
    throw error;
  }
};
