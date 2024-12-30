export const updateWordProgress = async (supabase, wordId, isCorrect) => {
  try {
    const { data: word, error: fetchError } = await supabase
      .from('words')
      .select('mastery_level')
      .eq('id', wordId)
      .single();

    if (fetchError) throw fetchError;

    const currentLevel = word?.mastery_level || 0;
    const change = isCorrect ? 10 : -5;
    const newLevel = Math.max(0, Math.min(100, currentLevel + change));

    const { error: updateError } = await supabase
      .from('words')
      .update({
        mastery_level: newLevel,
        last_practiced: new Date().toISOString()
        //TODO: add updating counts correct/incorrect
      })
      .eq('id', wordId);

    if (updateError) throw updateError;

    return newLevel;
  } catch (error) {
    console.error('Error updating word progress:', error);
    throw error;
  }
};
