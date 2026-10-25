import type { SupabaseClient } from '@supabase/supabase-js';
import type { Account } from '$lib/types';

declare global {
	namespace App {
		interface Locals {
			account: Account | null;
			supabase: SupabaseClient | null;
		}
	}
}

export {};
