import { Database } from './supabase';

export type Student = Database['public']['Tables']['students']['Row'];

