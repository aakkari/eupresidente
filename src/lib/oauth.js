import { getSupabase, temSupabase } from './supabase.js'

// Sessao que ficou esperando dono enquanto a pessoa passava pelo Google.
// O login por provedor externo sai do site e volta; sem guardar o token aqui,
// a volta cai num resultado orfao e a pessoa precisa clicar em "guardar" para
// receber o que ela acabou de responder.
const PENDENTE = 'eup:vincular'

export const marcarPendente = (token) => {
  try { localStorage.setItem(PENDENTE, token) } catch { /* modo privado */ }
}
export const lerPendente = () => {
  try { return localStorage.getItem(PENDENTE) } catch { return null }
}
export const limparPendente = () => {
  try { localStorage.removeItem(PENDENTE) } catch { /* modo privado */ }
}

// Quais provedores estao ligados no Supabase, perguntado ao proprio Supabase.
//
// Sem isto, ligar o Google exigiria um deploy do site em seguida — e, pior, o
// botao ficaria na tela quebrado no intervalo entre um e outro. Assim o botao
// aparece no instante em que o provedor e ligado no painel, e some se for
// desligado, sem ninguem tocar no codigo.
let cache = null
export async function provedores() {
  if (cache) return cache
  if (!temSupabase()) return (cache = {})
  try {
    const r = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/auth/v1/settings`, {
      headers: { apikey: import.meta.env.VITE_SUPABASE_ANON_KEY },
    })
    if (!r.ok) return (cache = {})
    const s = await r.json()
    return (cache = s?.external ?? {})
  } catch {
    // Falhar aqui nao pode custar nada: sem resposta, nenhum botao de
    // provedor aparece e o caminho de e-mail e senha continua inteiro.
    return (cache = {})
  }
}

export async function entrarComGoogle(voltarPara) {
  const sb = getSupabase()
  const { error } = await sb.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: `${window.location.origin}${voltarPara}` },
  })
  if (error) throw error
}
