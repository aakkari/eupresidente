import { exigirAdmin } from './_lib/auth.js'
import { json, erro, protegido } from './_lib/http.js'
import { posicaoPolitica } from './_lib/scoring.js'

// Usuarios: quem se cadastrou, e o que cada um respondeu.
//
// Sem ?usuario, devolve a lista. Com ?usuario=<uuid>, devolve o historico
// completo de um — que e o "analisar resultado um por um" do pedido.
export default protegido(async (req) => {
  const auth = await exigirAdmin(req)
  if (!auth.ok) return erro(auth.motivo, 401)
  const sb = auth.sb

  const alvo = new URL(req.url).searchParams.get('usuario')
  return alvo ? uma(sb, alvo) : todas(sb)
})

async function todas(sb) {
  const users = await usuarios(sb)
  const ids = users.map(u => u.id)
  if (!ids.length) return json({ usuarios: [] })

  const [{ data: perfis }, { data: sessoes }, { data: assinaturas }, { data: familias },
         { data: pagamentos }, { data: mensagens }, { data: membros }] =
    await Promise.all([
      sb.from('profiles').select('*').in('user_id', ids),
      sb.from('sessions').select('id, user_id, mode, status, started_at, completed_at')
        .in('user_id', ids),
      sb.from('subscriptions').select('user_id, status, period_end').in('user_id', ids),
      sb.from('archetypes').select('id, name'),
      sb.from('payments').select('user_id, amount_cents, status').in('user_id', ids),
      sb.from('contact_messages').select('user_id, email, status'),
      sb.from('group_members').select('user_id, group_id').in('user_id', ids),
    ])

  const completas = (sessoes ?? []).filter(s => s.status === 'completed')
  const { data: resultados } = completas.length
    ? await sb.from('results').select('session_id, vector, archetype_id, computed_at')
        .in('session_id', completas.map(s => s.id))
    : { data: [] }

  const porFamilia = Object.fromEntries((familias ?? []).map(a => [a.id, a.name]))
  const porPerfil = Object.fromEntries((perfis ?? []).map(p => [p.user_id, p]))
  const porAssinatura = Object.fromEntries((assinaturas ?? []).map(a => [a.user_id, a]))
  const sessaoDe = Object.fromEntries(completas.map(s => [s.id, s]))

  // Quanto cada pessoa ja pagou, quantas mensagens mandou e em quantas
  // comunidades esta. E o que transforma a lista de contas numa lista de
  // clientes.
  const pago = {}
  for (const p of pagamentos ?? []) if (p.status === 'pago')
    pago[p.user_id] = (pago[p.user_id] ?? 0) + Number(p.amount_cents ?? 0)

  const emailDe = Object.fromEntries(users.map(u => [(u.email ?? '').toLowerCase(), u.id]))
  const contatos = {}
  for (const m of mensagens ?? []) {
    // Mensagem sem login casa pelo email — muita gente escreve deslogada.
    const uid = m.user_id ?? emailDe[(m.email ?? '').toLowerCase()]
    if (uid) (contatos[uid] ??= { total: 0, abertas: 0 }).total++
    if (uid && ['novo', 'lido'].includes(m.status)) contatos[uid].abertas++
  }

  const comunidades = {}
  for (const m of membros ?? []) comunidades[m.user_id] = (comunidades[m.user_id] ?? 0) + 1

  // O ultimo resultado de cada pessoa: e ele que descreve onde ela esta hoje.
  const ultimo = new Map()
  for (const r of (resultados ?? []).sort((a, b) => new Date(b.computed_at) - new Date(a.computed_at))) {
    const uid = sessaoDe[r.session_id]?.user_id
    if (uid && !ultimo.has(uid)) ultimo.set(uid, r)
  }

  return json({
    usuarios: users.map(u => {
      const r = ultimo.get(u.id)
      const a = porAssinatura[u.id]
      const p = porPerfil[u.id]
      return {
        id: u.id, email: u.email, criada_em: u.created_at, ultimo_acesso: u.last_sign_in_at,
        confirmada: Boolean(u.email_confirmed_at),
        nome: p?.full_name || p?.display_name || null,
        uf: p?.uf ?? null, cidade: p?.city ?? null,
        escolaridade: p?.education ?? null, ocupacao: p?.occupation ?? null,
        nascimento: p?.birth_year ?? null,
        questionarios: completas.filter(s => s.user_id === u.id).length,
        posicao: r ? posicaoPolitica(r.vector).posicao : null,
        rotulo: r ? posicaoPolitica(r.vector).rotulo : null,
        familia: r ? (porFamilia[r.archetype_id] ?? r.archetype_id) : null,
        assinante: Boolean(a && ['ativa', 'cancelada'].includes(a.status) &&
                           a.period_end && new Date(a.period_end) > new Date()),
        pago_centavos: pago[u.id] ?? 0,
        mensagens: contatos[u.id]?.total ?? 0,
        mensagens_abertas: contatos[u.id]?.abertas ?? 0,
        comunidades: comunidades[u.id] ?? 0,
      }
    }).sort((a, b) => new Date(b.criada_em) - new Date(a.criada_em)),
  })
}

async function uma(sb, uid) {
  const users = await usuarios(sb)
  const user = users.find(u => u.id === uid)
  if (!user) return erro('usuario nao encontrado', 404)

  const [{ data: perfil }, { data: sessoes }, { data: assinatura }, { data: familias }] =
    await Promise.all([
      sb.from('profiles').select('*').eq('user_id', uid).maybeSingle(),
      sb.from('sessions').select('id, token, mode, status, started_at, completed_at')
        .eq('user_id', uid).order('started_at', { ascending: false }),
      sb.from('subscriptions').select('*').eq('user_id', uid).maybeSingle(),
      sb.from('archetypes').select('id, name'),
    ])

  const [{ data: pagamentos }, { data: mensagens }, { data: membros }] = await Promise.all([
    sb.from('payments').select('*').eq('user_id', uid).order('created_at', { ascending: false }),
    sb.from('contact_messages')
      .select('id, subject, message, status, created_at')
      .or(`user_id.eq.${uid},email.eq.${(user.email ?? '').toLowerCase()}`)
      .order('created_at', { ascending: false }),
    sb.from('group_members').select('group_id, shared, joined_at').eq('user_id', uid),
  ])

  const { data: grupos } = membros?.length
    ? await sb.from('groups').select('id, name, owner_id').in('id', membros.map(m => m.group_id))
    : { data: [] }

  const ids = (sessoes ?? []).map(s => s.id)
  const [{ data: resultados }, { data: respostas }] = await Promise.all([
    ids.length
      ? sb.from('results').select('*').in('session_id', ids)
      : Promise.resolve({ data: [] }),
    ids.length
      ? sb.from('responses').select('session_id, answered_at').in('session_id', ids)
      : Promise.resolve({ data: [] }),
  ])

  const porFamilia = Object.fromEntries((familias ?? []).map(a => [a.id, a.name]))
  const porSessao = {}
  for (const r of respostas ?? []) (porSessao[r.session_id] ??= []).push(new Date(r.answered_at))

  return json({
    usuario: {
      id: user.id, email: user.email, criada_em: user.created_at,
      ultimo_acesso: user.last_sign_in_at, confirmada: Boolean(user.email_confirmed_at),
      perfil: perfil ?? null,
      assinatura: assinatura ?? null,
      pagamentos: pagamentos ?? [],
      mensagens: mensagens ?? [],
      comunidades: (membros ?? []).map(m => ({
        nome: (grupos ?? []).find(g => g.id === m.group_id)?.name ?? 'comunidade',
        dono: (grupos ?? []).find(g => g.id === m.group_id)?.owner_id === uid,
        aparece_no_mapa: m.shared, desde: m.joined_at,
      })),
    },
    questionarios: (sessoes ?? []).map(s => {
      const r = (resultados ?? []).find(x => x.session_id === s.id)
      const tempos = porSessao[s.id] ?? []
      return {
        token: s.token, mode: s.mode, status: s.status,
        iniciado: s.started_at, terminado: s.completed_at,
        respondidas: tempos.length,
        // Duracao pelo primeiro e ultimo clique, e nao por started_at: quem
        // abre, some por duas horas e volta apareceria com sessao de duas horas.
        duracao_s: duracao(tempos),
        posicao: r ? posicaoPolitica(r.vector) : null,
        familia: r ? (porFamilia[r.archetype_id] ?? r.archetype_id) : null,
        vector: r?.vector ?? null,
        facet_vector: r?.facet_vector ?? null,
        confidence: r?.confidence ?? null,
        consistency: r?.consistency ?? null,
        neutral_rate: r?.neutral_rate ?? null,
        tensions: r?.tensions ?? [],
        quality_flags: r?.quality_flags ?? [],
        research_eligible: r?.research_eligible ?? null,
      }
    }),
  })
}

function duracao(datas) {
  if (datas.length < 2) return null
  const ordenadas = [...datas].sort((a, b) => a - b)
  return Math.round((ordenadas.at(-1) - ordenadas[0]) / 1000)
}

// auth.users nao e consultavel pelo PostgREST; vem pela API de admin, paginada.
async function usuarios(sb) {
  const todos = []
  for (let pagina = 1; pagina <= 20; pagina++) {
    const { data, error } = await sb.auth.admin.listUsers({ page: pagina, perPage: 1000 })
    if (error || !data?.users?.length) break
    todos.push(...data.users)
    if (data.users.length < 1000) break
  }
  return todos
}
