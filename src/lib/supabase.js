import { createClient } from '@supabase/supabase-js'

// Criado sob demanda, e nao no import.
//
// O client so e usado no login do admin — o questionario inteiro conversa
// apenas com as Netlify Functions. Criar no import fazia falta de variavel de
// ambiente derrubar o app todo com "supabaseUrl is required", tela branca no
// site publico incluida. Agora falta de configuracao quebra so o admin, e com
// mensagem legivel.
let cliente = null

export function temSupabase() {
  return Boolean(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY)
}

export function getSupabase() {
  if (!temSupabase())
    throw new Error('VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY nao configuradas')
  cliente ??= createClient(
    import.meta.env.VITE_SUPABASE_URL,
    import.meta.env.VITE_SUPABASE_ANON_KEY,
    { auth: { persistSession: true } },
  )
  return cliente
}
