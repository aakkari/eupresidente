import { useEffect, useState } from 'react'
import { getSupabase, temSupabase } from './supabase.js'

// Sessao do usuario comum. O admin usa o mesmo Supabase Auth, e a diferenca
// entre os dois esta no servidor: a Function confere o email contra
// ADMIN_EMAILS. Aqui nao existe nocao de papel — de proposito.
export function useAuth() {
  const [sessao, setSessao] = useState(undefined)   // undefined = carregando

  useEffect(() => {
    if (!temSupabase()) return setSessao(null)
    const sb = getSupabase()
    sb.auth.getSession().then(({ data }) => setSessao(data.session))
    const { data: sub } = sb.auth.onAuthStateChange((_e, s) => setSessao(s))
    return () => sub.subscription.unsubscribe()
  }, [])

  return {
    sessao,
    carregando: sessao === undefined,
    token: sessao?.access_token ?? null,
    email: sessao?.user?.email ?? null,
    sair: () => getSupabase().auth.signOut(),
  }
}
