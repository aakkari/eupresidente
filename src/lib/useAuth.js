import { useEffect, useState } from 'react'
import { getSupabase, temSupabase } from './supabase.js'
import { meuPerfil } from './api.js'

// Sessao do usuario comum. O admin usa o mesmo Supabase Auth, e a diferenca
// entre os dois esta no servidor: a Function confere o email contra
// ADMIN_EMAILS. Aqui nao existe nocao de papel — de proposito.

// O nome vive em profiles, e nao na sessao. Cache por id de usuario para o
// cabecalho nao disparar uma chamada a cada tela: o App fica montado a
// navegacao inteira, mas outros componentes tambem usam este hook.
const nomes = new Map()

export function useAuth() {
  const [sessao, setSessao] = useState(undefined)   // undefined = carregando
  const [nome, setNome] = useState(null)

  useEffect(() => {
    if (!temSupabase()) return setSessao(null)
    const sb = getSupabase()
    sb.auth.getSession().then(({ data }) => setSessao(data.session))
    const { data: sub } = sb.auth.onAuthStateChange((_e, s) => setSessao(s))
    return () => sub.subscription.unsubscribe()
  }, [])

  const uid = sessao?.user?.id
  const token = sessao?.access_token ?? null

  useEffect(() => {
    if (!uid || !token) return setNome(null)
    if (nomes.has(uid)) return setNome(nomes.get(uid))

    let vivo = true
    meuPerfil(token)
      .then(p => {
        // Cai para a parte antes do @ so quando nao ha nada melhor: um
        // cabecalho escrito "andreakkari" e pior do que o nome, e melhor do
        // que o email inteiro espremido no canto.
        const n = p?.full_name || p?.display_name || (p?.email ?? '').split('@')[0] || null
        nomes.set(uid, n)
        if (vivo) setNome(n)
      })
      .catch(() => {})
    return () => { vivo = false }
  }, [uid, token])

  return {
    sessao, nome,
    carregando: sessao === undefined,
    token,
    email: sessao?.user?.email ?? null,
    sair: () => { nomes.clear(); return getSupabase().auth.signOut() },
  }
}

// Chamar depois de salvar o perfil, senao o cabecalho continua com o nome
// antigo ate a pessoa recarregar a pagina.
export function esquecerNome(uid) {
  if (uid) nomes.delete(uid); else nomes.clear()
}
