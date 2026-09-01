import { admin } from './_lib/supabase.js'
import { json, erro, corpo, protegido } from './_lib/http.js'

// Vincula uma sessao anonima ja concluida a quem acabou de criar conta.
//
// A ordem importa: a pessoa responde sem cadastro e so depois decide se quer
// guardar. Pedir conta antes de responder derruba a taxa de conclusao, e o
// resultado e justamente o argumento para criar a conta.
export default protegido(async (req) => {
  if (req.method !== 'POST') return erro('metodo nao permitido', 405)

  const body = await corpo(req)
  const header = req.headers.get('authorization') || ''
  const jwt = header.startsWith('Bearer ') ? header.slice(7) : null
  if (!jwt || !body?.token) return erro('login e token da sessao obrigatorios', 401)

  const sb = admin()
  const { data: auth, error: eAuth } = await sb.auth.getUser(jwt)
  if (eAuth || !auth?.user) return erro('login invalido', 401)

  // claim_session recusa sessao ja vinculada ou incompleta, e a mensagem de
  // erro dela e a resposta certa para o usuario.
  const { data, error } = await sb.rpc('claim_session', {
    p_token: body.token,
    p_user_id: auth.user.id,
  })
  if (error) return erro(error.message, 409)

  // Perfil criado na primeira vinculacao, nao no cadastro: quem cria conta e
  // nao responde nada nao precisa de linha em profiles.
  await sb.from('profiles').upsert({
    user_id: auth.user.id,
    display_name: body.display_name?.slice(0, 60) || auth.user.email?.split('@')[0] || null,
  }, { onConflict: 'user_id' })

  return json({ session_id: data })
})
