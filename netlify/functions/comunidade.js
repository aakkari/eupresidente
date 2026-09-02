import { admin } from './_lib/supabase.js'
import { exigirUsuario } from './_lib/auth.js'
import { json, erro, corpo, protegido, rateLimit } from './_lib/http.js'
import { posicaoPolitica } from './_lib/scoring.js'
import { enviarConvite, podeEnviar } from './_lib/email.js'

// Comunidades: criar, convidar por email, aceitar e ver o mapa.
//
// Duas regras estruturam tudo o que esta aqui:
//
// 1. Entrar e uma coisa; aparecer no mapa e outra. group_members.shared e o
//    segundo sim, e da para desligar sem sair da comunidade. Cada mudanca
//    escreve uma linha em consents com finalidade 'comunidade' — opiniao
//    politica e dado sensivel, e consentimento sensivel precisa ser
//    demonstravel, nao presumido.
//
// 2. Quem nao compartilha nao aparece, nem para o dono. A regra de visibilidade
//    mora aqui, uma vez, e nao em cada consulta espalhada.
const VERSAO_POLITICA = '2026-09'
const MAX_MEMBROS = 200

export default protegido(async (req) => {
  const url = new URL(req.url)

  // Previa do convite: aberta, porque quem recebeu o link ainda nao tem conta.
  // O token e a credencial; sai dele so o nome da comunidade e quem convidou —
  // o suficiente para a pessoa decidir, e nada sobre quem ja esta la dentro.
  if (req.method === 'GET' && url.searchParams.get('convite')) {
    return previaDoConvite(url.searchParams.get('convite'))
  }

  const auth = await exigirUsuario(req)
  if (!auth.ok) return erro(auth.motivo, 401)
  const { sb, uid, user } = auth

  if (req.method === 'GET') return await minhasComunidades(sb, uid, user.email)

  if (req.method === 'POST') {
    const body = await corpo(req) || {}
    const acao = String(body.acao ?? '')
    const acoes = { criar, convidar, aceitar, recusar, sair, compartilhar, cancelar_convite: cancelarConvite }
    const fn = acoes[acao]
    if (!fn) return erro(`acao desconhecida: ${acao || '(vazia)'}`)
    return await fn({ sb, uid, user, body, origem: url.origin })
  }

  return erro('metodo nao permitido', 405)
})

// ------------------------------------------------------------------- leitura

async function minhasComunidades(sb, uid, email) {
  const { data: minhas } = await sb.from('group_members')
    .select('group_id, shared, joined_at').eq('user_id', uid)

  const ids = (minhas ?? []).map(m => m.group_id)

  const [{ data: grupos }, { data: convitesRecebidos }] = await Promise.all([
    ids.length
      ? sb.from('groups').select('id, name, owner_id, created_at').in('id', ids)
      : Promise.resolve({ data: [] }),
    // eq e nao ilike: no ilike o _ do email seria curinga, e quem tem
    // a_b@x.com passaria a ver convites endereçados a axb@x.com. O email ja
    // entra em minusculas em convidar(), entao a comparacao exata basta.
    sb.from('group_invites')
      .select('token, group_id, created_at, invited_by')
      .eq('email', (email ?? '').toLowerCase()).eq('status', 'pendente'),
  ])

  const [{ visiveis, ocultos }, convitesEnviados] = await Promise.all([
    membrosDe(sb, ids, uid),
    ids.length
      ? sb.from('group_invites').select('id, group_id, email, created_at')
          .in('group_id', ids).eq('status', 'pendente')
      : Promise.resolve({ data: [] }),
  ])

  // Convite recebido precisa do nome da comunidade e de quem convidou, e essas
  // duas coisas estao fora dos grupos de que a pessoa ja faz parte.
  const idsConvite = (convitesRecebidos ?? []).map(c => c.group_id)
  const { data: gruposConvite } = idsConvite.length
    ? await sb.from('groups').select('id, name, owner_id').in('id', idsConvite)
    : { data: [] }
  const nomes = await nomesDe(sb, [
    ...(gruposConvite ?? []).map(g => g.owner_id),
    ...(convitesRecebidos ?? []).map(c => c.invited_by),
  ])

  const meu = Object.fromEntries((minhas ?? []).map(m => [m.group_id, m]))

  return json({
    comunidades: (grupos ?? [])
      .map(g => ({
        id: g.id, nome: g.name, criada_em: g.created_at,
        sou_dono: g.owner_id === uid,
        compartilhando: Boolean(meu[g.id]?.shared),
        membros: visiveis[g.id] ?? [],
        // Quem nao compartilha nao aparece na lista, mas a comunidade nao pode
        // fingir que ela nao existe: o total inclui todo mundo.
        total_membros: (visiveis[g.id] ?? []).length + (ocultos[g.id] ?? 0),
        convites: (convitesEnviados.data ?? []).filter(c => c.group_id === g.id),
      }))
      .sort((a, b) => new Date(b.criada_em) - new Date(a.criada_em)),

    convites_recebidos: (convitesRecebidos ?? []).map(c => ({
      token: c.token, quando: c.created_at,
      comunidade: (gruposConvite ?? []).find(g => g.id === c.group_id)?.name ?? 'comunidade',
      convidado_por: nomes[c.invited_by] ?? 'alguém',
    })),

    email_ativo: podeEnviar(),
  })
}

// Membros visiveis de cada comunidade, com a posicao mais recente de cada um.
// Sempre a mais recente, e nao uma foto congelada: quem responde de novo e
// muda de posicao nao pode continuar aparecendo onde nao esta mais.
async function membrosDe(sb, ids, uid) {
  if (!ids.length) return { visiveis: {}, ocultos: {} }

  const { data: linhas } = await sb.from('group_members')
    .select('group_id, user_id, shared').in('group_id', ids)

  const compartilhando = (linhas ?? []).filter(l => l.shared)
  const ocultos = {}
  for (const l of linhas ?? []) if (!l.shared) ocultos[l.group_id] = (ocultos[l.group_id] ?? 0) + 1

  const users = [...new Set(compartilhando.map(l => l.user_id))]
  if (!users.length) return { visiveis: {}, ocultos }

  const [{ data: sessoes }, nomes, { data: familias }] = await Promise.all([
    sb.from('sessions').select('id, user_id, completed_at')
      .in('user_id', users).eq('status', 'completed')
      .order('completed_at', { ascending: false }),
    nomesDe(sb, users),
    sb.from('archetypes').select('id, name, color'),
  ])

  // Uma sessao por pessoa: a primeira de cada, que a ordenacao acima ja garante
  // ser a mais recente.
  const ultima = new Map()
  for (const s of sessoes ?? []) if (!ultima.has(s.user_id)) ultima.set(s.user_id, s)

  const { data: resultados } = ultima.size
    ? await sb.from('results').select('session_id, vector, archetype_id, computed_at')
        .in('session_id', [...ultima.values()].map(s => s.id))
    : { data: [] }

  const porSessao = Object.fromEntries((resultados ?? []).map(r => [r.session_id, r]))
  const porFamilia = Object.fromEntries((familias ?? []).map(a => [a.id, a]))

  const visiveis = {}
  for (const l of compartilhando) {
    const s = ultima.get(l.user_id)
    const r = s && porSessao[s.id]
    // Membro sem resultado ainda aparece na lista, sem ponto no mapa: sumir
    // seria pior — quem convidou ficaria sem saber se a pessoa entrou.
    const f = r ? porFamilia[r.archetype_id] : null
    ;(visiveis[l.group_id] ??= []).push({
      user_id: l.user_id,
      // Marcado no servidor: o browser nao sabe o proprio uid, e o mapa precisa
      // saber qual ponto destacar.
      sou_eu: l.user_id === uid,
      nome: nomes[l.user_id] ?? 'sem nome',
      vector: r?.vector ?? null,
      posicao: r ? posicaoPolitica(r.vector) : null,
      familia: f?.name ?? null,
      quando: r?.computed_at ?? null,
    })
  }

  // Ordenado pela posicao: a lista embaixo do mapa le da esquerda para a
  // direita, na mesma ordem em que os pontos aparecem.
  for (const id of ids) (visiveis[id] ??= []).sort((a, b) =>
    (a.posicao?.posicao ?? 999) - (b.posicao?.posicao ?? 999))

  return { visiveis, ocultos }
}

// Nome de exibicao. Cai para o email so quando nao ha nada melhor: um mapa com
// "sem nome" repetido nao serve para nada, e o email ja e conhecido de quem
// convidou.
async function nomesDe(sb, ids) {
  const unicos = [...new Set(ids.filter(Boolean))]
  if (!unicos.length) return {}

  const { data: perfis } = await sb.from('profiles')
    .select('user_id, display_name, full_name').in('user_id', unicos)

  const saida = {}
  for (const p of perfis ?? []) {
    const nome = p.display_name || p.full_name
    if (nome) saida[p.user_id] = nome
  }

  const faltando = unicos.filter(id => !saida[id])
  if (faltando.length) {
    const emails = await emailsDe(sb, faltando)
    for (const id of faltando) if (emails[id]) saida[id] = emails[id].split('@')[0]
  }
  return saida
}

async function emailsDe(sb, ids) {
  const alvo = new Set(ids)
  const saida = {}
  for (let pagina = 1; pagina <= 10; pagina++) {
    const { data, error } = await sb.auth.admin.listUsers({ page: pagina, perPage: 1000 })
    if (error || !data?.users?.length) break
    for (const u of data.users) if (alvo.has(u.id)) saida[u.id] = u.email
    if (data.users.length < 1000) break
  }
  return saida
}

async function previaDoConvite(token) {
  const sb = admin()
  const { data: convite } = await sb.from('group_invites')
    .select('group_id, invited_by, status, email').eq('token', token).maybeSingle()

  if (!convite) return erro('convite nao encontrado', 404)
  if (convite.status !== 'pendente') return erro(`convite ja ${convite.status}`, 409)

  const { data: grupo } = await sb.from('groups')
    .select('name').eq('id', convite.group_id).single()
  const nomes = await nomesDe(sb, [convite.invited_by])

  return json({
    convite: {
      comunidade: grupo?.name ?? 'comunidade',
      convidado_por: nomes[convite.invited_by] ?? 'alguém',
      // O email vem para a tela poder avisar quando a pessoa esta logada com
      // outra conta — erro comum e frustrante de diagnosticar sozinho.
      email: convite.email,
    },
  })
}

// --------------------------------------------------------------------- acoes

async function criar({ sb, uid, body }) {
  const nome = String(body.nome ?? '').trim().slice(0, 60)
  if (!nome) return erro('a comunidade precisa de um nome')

  const { data: grupo, error } = await sb.from('groups').insert({
    name: nome, owner_id: uid, invite_code: crypto.randomUUID(),
  }).select('id, name').single()
  if (error) return erro(error.message, 400)

  // Quem cria entra compartilhando: criar uma comunidade para nao aparecer
  // nela seria pedir dos outros o que nao se da.
  await sb.from('group_members').insert({ group_id: grupo.id, user_id: uid, shared: true })
  await registrarConsentimento(sb, uid, true)

  return json({ ok: true, id: grupo.id })
}

async function convidar({ sb, uid, body, origem }) {
  const email = String(body.email ?? '').trim().toLowerCase()
  const grupoId = String(body.grupo ?? '')
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return erro('email invalido')

  const membro = await souMembro(sb, grupoId, uid)
  if (!membro) return erro('você não faz parte dessa comunidade', 403)

  // Freio de spam: a caixa de entrada de terceiros e o recurso em risco aqui,
  // nao o nosso banco.
  if (!await rateLimit(sb, `convite:${uid}`, 30, 3600))
    return erro('muitos convites em pouco tempo, tente daqui a pouco', 429)

  const { count } = await sb.from('group_members')
    .select('user_id', { count: 'exact', head: true }).eq('group_id', grupoId)
  if ((count ?? 0) >= MAX_MEMBROS) return erro(`o limite é de ${MAX_MEMBROS} pessoas`, 409)

  const { data: grupo } = await sb.from('groups').select('name').eq('id', grupoId).single()

  const { data: convite, error } = await sb.from('group_invites')
    .insert({ group_id: grupoId, email, invited_by: uid })
    .select('token').single()

  // Violacao do indice parcial: ja existe um convite pendente para esse email.
  if (error?.code === '23505') return erro('essa pessoa já tem um convite pendente', 409)
  if (error) return erro(error.message, 400)

  const link = `${origem}/comunidade?convite=${convite.token}`
  const nomes = await nomesDe(sb, [uid])
  const envio = await enviarConvite({
    para: email, comunidade: grupo?.name ?? 'comunidade',
    convidadoPor: nomes[uid] ?? 'alguém', link,
  })

  return json({ ok: true, link, enviado: envio.enviado, motivo: envio.motivo ?? null })
}

async function aceitar({ sb, uid, user, body }) {
  const { data: convite } = await sb.from('group_invites')
    .select('id, group_id, email, status').eq('token', String(body.token ?? '')).maybeSingle()

  if (!convite) return erro('convite nao encontrado', 404)
  if (convite.status !== 'pendente') return erro(`convite ja ${convite.status}`, 409)

  // O convite e para um email. Aceitar logado com outra conta colocaria no
  // mapa uma pessoa que nao foi convidada.
  if ((user.email ?? '').toLowerCase() !== convite.email.toLowerCase())
    return erro(`esse convite é para ${convite.email} — entre com essa conta para aceitar`, 403)

  // shared: true e o proprio sim. A tela diz, antes do botao, que aceitar
  // divide a posicao com a comunidade; gravar false aqui contradiria o texto
  // que a pessoa acabou de ler.
  const { error } = await sb.from('group_members')
    .upsert({ group_id: convite.group_id, user_id: uid, shared: true },
            { onConflict: 'group_id,user_id' })
  if (error) return erro(error.message, 400)

  await Promise.all([
    sb.from('group_invites').update({ status: 'aceito', responded_at: new Date().toISOString() })
      .eq('id', convite.id),
    registrarConsentimento(sb, uid, true),
  ])

  return json({ ok: true, id: convite.group_id })
}

async function recusar({ sb, body }) {
  const { data: convite } = await sb.from('group_invites')
    .select('id, status').eq('token', String(body.token ?? '')).maybeSingle()
  if (!convite) return erro('convite nao encontrado', 404)
  if (convite.status !== 'pendente') return json({ ok: true })

  await sb.from('group_invites')
    .update({ status: 'recusado', responded_at: new Date().toISOString() }).eq('id', convite.id)

  // Quem convidou nao e avisado de recusa. O convite so deixa de aparecer como
  // pendente. Dizer "fulano recusou" transforma uma resposta privada em
  // constrangimento social — e a pessoa nao pediu para ter essa conversa.
  return json({ ok: true })
}

async function sair({ sb, uid, body }) {
  const grupoId = String(body.grupo ?? '')
  const { error } = await sb.from('group_members').delete()
    .eq('group_id', grupoId).eq('user_id', uid)
  if (error) return erro(error.message, 400)

  await registrarConsentimento(sb, uid, false)

  // Comunidade sem ninguem nao precisa continuar existindo, e o dono que sai
  // nao pode deixar um grupo orfao com o nome dele preso nele.
  const { count } = await sb.from('group_members')
    .select('user_id', { count: 'exact', head: true }).eq('group_id', grupoId)
  if (!count) await sb.from('groups').delete().eq('id', grupoId)

  return json({ ok: true })
}

async function compartilhar({ sb, uid, body }) {
  const compartilhando = Boolean(body.compartilhando)
  const { error } = await sb.from('group_members')
    .update({ shared: compartilhando })
    .eq('group_id', String(body.grupo ?? '')).eq('user_id', uid)
  if (error) return erro(error.message, 400)

  await registrarConsentimento(sb, uid, compartilhando)
  return json({ ok: true })
}

async function cancelarConvite({ sb, uid, body }) {
  const { data: convite } = await sb.from('group_invites')
    .select('id, group_id').eq('id', String(body.id ?? '')).maybeSingle()
  if (!convite) return erro('convite nao encontrado', 404)
  if (!await souMembro(sb, convite.group_id, uid)) return erro('não é sua comunidade', 403)

  await sb.from('group_invites').update({ status: 'cancelado' }).eq('id', convite.id)
  return json({ ok: true })
}

// ------------------------------------------------------------------ auxiliares

async function souMembro(sb, grupoId, uid) {
  if (!grupoId) return false
  const { data } = await sb.from('group_members')
    .select('user_id').eq('group_id', grupoId).eq('user_id', uid).maybeSingle()
  return Boolean(data)
}

// Uma linha nova a cada mudanca, e a anterior fica marcada como revogada. O
// historico e o ponto: consentimento sem data nao prova nada.
async function registrarConsentimento(sb, uid, concedido) {
  const agora = new Date().toISOString()
  await sb.from('consents')
    .update({ revoked_at: agora })
    .eq('user_id', uid).eq('purpose', 'comunidade').is('revoked_at', null)
  await sb.from('consents').insert({
    user_id: uid, purpose: 'comunidade', granted: concedido,
    policy_version: VERSAO_POLITICA,
  })
}
