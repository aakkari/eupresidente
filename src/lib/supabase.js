import { createClient } from '@supabase/supabase-js'

// A anon key so serve para autenticacao do admin. Leitura publica de
// instrumento e arquetipos passa pelas Functions, para nao expor o gabarito.
export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
)
