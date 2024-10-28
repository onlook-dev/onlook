import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from './db';

export type Client = SupabaseClient<Database>;

export * from './db';
