import { exigirAdmin } from './_lib/auth.js'
import { json, erro, protegido } from './_lib/http.js'
import { posicaoPolitica } from './_lib/scoring.js'

// Comunidades criadas: quais sao, quem esta em cada uma, e o quanto cada uma
// concorda consigo mesma.
//
// A dispersao interna e o numero interessante: uma familia inteira em 12
// pontos de desvio nao e a mesma coisa que um grupo de trabalho espalhado por
// 40. E o que diz se a comunidade e bolha ou arena.
export default protegido(async (req) => {
  const auth = await exigirAdmin(req)
  if (!auth.ok) return erro(auth.motivo, 401)
  const sb = auth.sb

  const [{ data: grupos }, { data: membros }, { data: convites }] = await Promise.all([
    sb.from('groups').select('id, name, owner_id, created_at')
      .order('created_at', { ascending: false }).limit(500),
    sb.from('group_members').select('group_id, user_id, shared, joined_at'),
    sb.from('group_invites').select('group_id, status'),
  ])

  if (!grupos?.length) return json({ comunidades: [], totais: vazio() })

  const users = [...new Set((membros ?? []).map(m => m.user_id))]
  const [nomes, posicoes] = await Promise.all([nomesDe(sb, users), posicoesDe(sb, users)])

  const comunidades = grupos.map(g => {
    const dela = (membros ?? []).filter(m => m.group_id === g.id)
    const seus = (convites ?? []).filter(c => c.group_id === g.id)
    const pontos = dela.map(m => posicoes[m.user_id]).filter(p => p != null)

    return {
      id: g.id, nome: g.name, criada_em: g.created_at,
      dono: nomes[g.owner_id] ?? '—',
      membros: dela.length,
      no_mapa: dela.filter(m => m.shared).length,
      convites_pendentes: seus.filter(c => c.status === 'pendente').length,
      convites_aceitos: seus.filter(c => c.status === 'aceito').length,
      convites_recusados: seus.filter(c => c.status === 'recusado').length,
      com_resultado: pontos.length,
      posicao_media: pontos.length ? Math.round(media(pontos)) : null,
      // Desvio padrao da posicao dentro do grupo: quanto a comunidade diverge
      // internamente. Menos de 10 e bolha; acima de 25 e gente que discorda
      // sentada na mesma mesa.
      dispersao: pontos.length > 1 ? Number(desvio(pontos).toFixed(1)) : null,
      pessoas: dela
        .map(m => ({ nome: nomes[m.user_id] ?? '—', no_mapa: m.shared,
                     posicao: posicoes[m.user_id] ?? null, desde: m.joined_at }))
        .sort((a, b) => (a.posicao ?? 999) - (b.posicao ?? 999)),
    }
  })

  const aceitos = (convites ?? []).filter(c => c.status === 'aceito').length
  const respondidos = (convites ?? []).filter(c => ['aceito', 'recusado'].includes(c.status)).length

  return json({
    comunidades,
    totais: {
      comunidades: grupos.length,
      pessoas: users.length,
      media_por_comunidade: Number((media(comunidades.map(c => c.membros)) ?? 0).toFixed(1)),
      convites: (convites ?? []).length,
      // Quantos dos convites respondidos viraram entrada. Convite ignorado nao
      // entra na conta: nao e recusa, e silencio.
      taxa_aceite: respondidos ? Number((aceitos / respondidos).toFixed(2)) : null,
    },
  })
})

const vazio = () => ({ comunidades: 0, pessoas: 0, media_por_comunidade: 0, convites: 0, taxa_aceite: null })
const media = (ns) => ns.length ? ns.reduce((s, v) => s + v, 0) / ns.length : null

function desvio(ns) {
  const m = media(ns)
  return Math.sqrt(ns.reduce((s, v) => s + (v - m) ** 2, 0) / ns.length)
}

// Posicao mais recente de cada pessoa — a mesma regra do mapa da comunidade.
async function posicoesDe(sb, ids) {
  if (!ids.length) return {}
  const { data: sessoes } = await sb.from('sessions')
    .select('id, user_id, completed_at').in('user_id', ids).eq('status', 'completed')
    .order('completed_at', { ascending: false })

  const ultima = new Map()
  for (const s of sessoes ?? []) if (!ultima.has(s.user_id)) ultima.set(s.user_id, s)
  if (!ultima.size) return {}

  const { data: resultados } = await sb.from('results')
    .select('session_id, vector').in('session_id', [...ultima.values()].map(s => s.id))

  const porSessao = Object.fromEntries((resultados ?? []).map(r => [r.session_id, r]))
  const saida = {}
  for (const [uid, s] of ultima) {
    const r = porSessao[s.id]
    if (r) saida[uid] = posicaoPolitica(r.vector).posicao
  }
  return saida
}

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
  if (!faltando.length) return saida

  const alvo = new Set(faltando)
  for (let pagina = 1; pagina <= 10; pagina++) {
    const { data, error } = await sb.auth.admin.listUsers({ page: pagina, perPage: 1000 })
    if (error || !data?.users?.length) break
    for (const u of data.users) if (alvo.has(u.id)) saida[u.id] = u.email
    if (data.users.length < 1000) break
  }
  return saida
}
