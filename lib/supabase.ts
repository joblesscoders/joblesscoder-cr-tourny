import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
// Support both old anon key name and new publishable key name
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY

if (!supabaseUrl || !supabaseAnonKey) {
	throw new Error(
		'Supabase: set NEXT_PUBLIC_SUPABASE_URL and either NEXT_PUBLIC_SUPABASE_ANON_KEY or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY in your environment.',
	)
}

// Use an untyped Supabase client to avoid "never" insert/update typing issues
// when the generated Database type does not exactly match the SDK expectations.
export const supabase = createClient(supabaseUrl, supabaseAnonKey)