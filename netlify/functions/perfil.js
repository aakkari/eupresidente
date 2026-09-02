import { admin } from './_lib/supabase.js'
import { json, erro, corpo, protegido } from './_lib/http.js'

// Le e grava os dados da conta. Sem CPF nem documento, por decisao registrada
// na migration: identificador unico somado a opiniao politica e o pior tipo
// de base para existir.
export default protegido(async (req) => {
  const header = req.headers.get('authorization') || ''
  const jwt = header.startsWith('Bearer ') ? header.slice(7) : null
  if (!jwt) return erro('login obrigatorio', 401)

  const sb = admin()
  const { data: auth, error: eAuth } = await sb.auth.getUser(jwt)
  if (eAuth || !auth?.user) return erro('login invalido', 401)
  const uid = auth.user.id

  if (req.method === 'GET') {
    const { data } = await sb.from('profiles')
      .select('full_name, display_name, phone, created_at').eq('user_id', uid).maybeSingle()
    const { count } = await sb.from('sessions')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', uid).eq('status', 'completed')
    return json({
      email: auth.user.email,
      desde: data?.created_at ?? auth.user.created_at,
      questionarios: count ?? 0,
      ...(data ?? {}),
    })
  }

  if (req.method === 'PATCH') {
    const body = await corpo(req) || {}
    const campos = { user_id: uid, updated_at: new Date().toISOString() }
    // Limites de tamanho no servidor: o front pode ser contornado.
    if ('full_name' in body)    campos.full_name    = String(body.full_name ?? '').slice(0, 120) || null
    if ('display_name' in body) campos.display_name = String(body.display_name ?? '').slice(0, 60) || null
    if ('phone' in body)        campos.phone        = String(body.phone ?? '').replace(/[^\d+() -]/g, '').slice(0, 24) || null

    const { error } = await sb.from('profiles').upsert(campos, { onConflict: 'user_id' })
    if (error) return erro(error.message, 400)
    return json({ ok: true })
  }

  return erro('metodo nao permitido', 405)
})
