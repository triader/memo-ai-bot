import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
  throw new Error('Supabase environment variables are missing');
}

export const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
