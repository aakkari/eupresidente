import { exigirAdmin } from './_lib/auth.js'
import { json, erro, corpo, protegido } from './_lib/http.js'

// Caixa de entrada do contato.
export default protegido(async (req) => {
  const auth = await exigirAdmin(req)
  if (!auth.ok) return erro(auth.motivo, 401)
  const sb = auth.sb

  if (req.method === 'GET') {
    const status = new URL(req.url).searchParams.get('status')
    let q = sb.from('contact_messages')
      .select('id, name, email, subject, message, user_id, status, created_at, handled_at')
      .order('created_at', { ascending: false }).limit(200)
    if (status && status !== 'todos') q = q.eq('status', status)

    const [{ data: mensagens }, { count: novas }] = await Promise.all([
      q,
      sb.from('contact_messages').select('id', { count: 'exact', head: true }).eq('status', 'novo'),
    ])
    return json({ mensagens: mensagens ?? [], novas: novas ?? 0 })
  }

  if (req.method === 'PATCH') {
    const body = await corpo(req) || {}
    const permitidos = ['novo', 'lido', 'respondido', 'arquivado']
    if (!permitidos.includes(body.status)) return erro('status invalido')

    const { error } = await sb.from('contact_messages').update({
      status: body.status,
      handled_at: body.status === 'novo' ? null : new Date().toISOString(),
    }).eq('id', String(body.id ?? ''))
    if (error) return erro(error.message, 400)
    return json({ ok: true })
  }

  return erro('metodo nao permitido', 405)
})
