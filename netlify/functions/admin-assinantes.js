import { exigirAdmin } from './_lib/auth.js'
import { json, erro, corpo, protegido } from './_lib/http.js'

// Lista de assinantes e concessao manual.
//
// Conceder na mao nao e gambiarra de enquanto-o-gateway-nao-chega: cortesia,
// imprensa, teste e reembolso vao continuar precisando disso depois. O que
// muda quando o gateway entrar e a origem da maioria das linhas, nao a
// existencia desta tela.
export default protegido(async (req) => {
  const auth = await exigirAdmin(req)
  if (!auth.ok) return erro(auth.motivo, 401)
  const sb = auth.sb

  if (req.method === 'GET') {
    const { data: assinaturas } = await sb.from('subscriptions')
      .select('*').order('updated_at', { ascending: false }).limit(200)

    const ids = (assinaturas ?? []).map(a => a.user_id)
    const emails = await emailsDe(sb, ids)
    const { data: perfis } = ids.length
      ? await sb.from('profiles').select('user_id, full_name, display_name').in('user_id', ids)
      : { data: [] }
    const porId = Object.fromEntries((perfis ?? []).map(p => [p.user_id, p]))

    return json({
      assinantes: (assinaturas ?? []).map(a => ({
        ...a,
        email: emails[a.user_id] ?? null,
        nome: porId[a.user_id]?.full_name ?? porId[a.user_id]?.display_name ?? null,
        vigente: ['ativa', 'cancelada'].includes(a.status) &&
                 a.period_end && new Date(a.period_end).getTime() > Date.now(),
      })),
    })
  }

  if (req.method === 'POST') {
    const body = await corpo(req) || {}
    const email = String(body.email ?? '').trim().toLowerCase()
    if (!email) return erro('email obrigatorio')

    const uid = await idPorEmail(sb, email)
    if (!uid) return erro('nenhuma conta com esse email', 404)

    const meses = Math.min(120, Math.max(1, Math.round(Number(body.meses ?? 12))))
    const inicio = new Date()
    const fim = new Date(inicio); fim.setMonth(fim.getMonth() + meses)

    const { error } = await sb.from('subscriptions').upsert({
      user_id: uid, status: 'ativa', gateway: 'manual',
      period_start: inicio.toISOString(), period_end: fim.toISOString(),
      cancel_at_period_end: false, updated_at: inicio.toISOString(),
    }, { onConflict: 'user_id' })
    if (error) return erro(error.message, 400)

    // Registro de valor zero no historico: a pessoa abre a conta e ve de onde
    // veio o acesso dela, em vez de uma assinatura que apareceu do nada.
    await sb.from('payments').insert({
      user_id: uid, amount_cents: 0, currency: 'BRL', status: 'pago',
      gateway: 'manual', method: 'cortesia', paid_at: inicio.toISOString(),
    })

    return json({ ok: true, vale_ate: fim.toISOString() })
  }

  if (req.method === 'DELETE') {
    const body = await corpo(req) || {}
    const email = String(body.email ?? '').trim().toLowerCase()
    const uid = await idPorEmail(sb, email)
    if (!uid) return erro('nenhuma conta com esse email', 404)

    // Encerra na hora, diferente do cancelamento que a propria pessoa faz: aqui
    // e o admin tirando um acesso que ele mesmo deu.
    const { error } = await sb.from('subscriptions').update({
      status: 'cancelada', period_end: new Date().toISOString(),
      cancel_at_period_end: true, updated_at: new Date().toISOString(),
    }).eq('user_id', uid)
    if (error) return erro(error.message, 400)
    return json({ ok: true })
  }

  return erro('metodo nao permitido', 405)
})

// A lista de usuarios do Auth nao e uma tabela consultavel pelo PostgREST;
// vem pela API de admin, paginada.
async function paginas(sb, limite = 1000) {
  const todos = []
  for (let pagina = 1; pagina <= 10; pagina++) {
    const { data, error } = await sb.auth.admin.listUsers({ page: pagina, perPage: limite })
    if (error || !data?.users?.length) break
    todos.push(...data.users)
    if (data.users.length < limite) break
  }
  return todos
}

async function emailsDe(sb, ids) {
  if (!ids.length) return {}
  const alvo = new Set(ids)
  const users = await paginas(sb)
  return Object.fromEntries(users.filter(u => alvo.has(u.id)).map(u => [u.id, u.email]))
}

async function idPorEmail(sb, email) {
  const users = await paginas(sb)
  return users.find(u => (u.email || '').toLowerCase() === email)?.id ?? null
}
