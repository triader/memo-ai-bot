export class UserService {
  constructor(supabase) {
    this.supabase = supabase;
  }

  async ensureUserExists(telegramUser) {
    const { data: existingUser, error: userError } = await this.supabase
      .from('telegram_users')
      .select('*')
      .eq('telegram_id', telegramUser.id)
      .single();

    if (!existingUser) {
      const { error: createError } = await this.supabase.from('telegram_users').insert([
        {
          telegram_id: telegramUser.id,
          username: telegramUser.username,
          first_name: telegramUser.first_name,
          last_name: telegramUser.last_name
        }
      ]);

      if (createError) throw createError;
    }

    return existingUser || { telegram_id: telegramUser.id };
  }
}
