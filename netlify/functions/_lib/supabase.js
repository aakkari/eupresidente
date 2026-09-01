import { createClient } from '@supabase/supabase-js'

// service_role ignora RLS e grants. So existe aqui dentro, nunca no browser.
// Ver decisao 1 no CLAUDE.md.
export function admin() {
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY ausente')
  return createClient(url, key, { auth: { persistSession: false } })
}
