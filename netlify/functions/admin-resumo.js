import { exigirAdmin } from './_lib/auth.js'
import { json, erro, protegido } from './_lib/http.js'

// A home do admin: o estado do produto em numeros, por recorte de tempo.
//
// Os quatro recortes vem calculados de uma vez. Trocar de janela na tela nao
// dispara chamada nova — a base ainda e pequena, e uma ida ao servidor por
// clique de filtro seria lentidao inventada.
const JANELAS = [
  { id: '7d',   rotulo: '7 dias',  dias: 7 },
  { id: '30d',  rotulo: '30 dias', dias: 30 },
  { id: '90d',  rotulo: '90 dias', dias: 90 },
  { id: 'tudo', rotulo: 'Tudo',    dias: null },
]

export default protegido(async (req) => {
  const auth = await exigirAdmin(req)
  if (!auth.ok) return erro(auth.motivo, 401)
  const sb = auth.sb

  const [users, sessoes, perfis, assinaturas, pagamentos, grupos, convites, mensagens, resultados] =
    await Promise.all([
      usuarios(sb),
      sb.from('sessions').select('id, status, started_at, completed_at').then(r => r.data ?? []),
      sb.from('profiles').select('user_id, uf, city, occupation, education, birth_year, phone, full_name, created_at, updated_at')
        .then(r => r.data ?? []),
      sb.from('subscriptions').select('user_id, status, period_end, created_at').then(r => r.data ?? []),
      sb.from('payments').select('amount_cents, status, paid_at, created_at').then(r => r.data ?? []),
      sb.from('groups').select('id, created_at').then(r => r.data ?? []),
      sb.from('group_invites').select('status, created_at').then(r => r.data ?? []),
      sb.from('contact_messages').select('status, created_at').then(r => r.data ?? []),
      sb.from('results').select('session_id, computed_at').then(r => r.data ?? []),
    ])

  const agora = Date.now()
  const dentro = (quando, dias) => {
    if (!quando) return false
    if (dias == null) return true
    return agora - new Date(quando).getTime() <= dias * 864e5
  }

  // "Perfil preenchido" nao e ter uma linha em profiles — toda conta ganha uma.
  // E ter respondido pelo menos um dos campos que servem para alguma coisa.
  const preenchido = (p) =>
    Boolean(p.uf || p.city || p.occupation || p.education || p.birth_year || p.phone || p.full_name)

  const janelas = Object.fromEntries(JANELAS.map(j => [j.id, {
    rotulo: j.rotulo,
    contas: users.filter(u => dentro(u.created_at, j.dias)).length,
    questionarios: sessoes.filter(s => s.status === 'completed' && dentro(s.completed_at, j.dias)).length,
    iniciados: sessoes.filter(s => dentro(s.started_at, j.dias)).length,
    perfis: perfis.filter(p => preenchido(p) && dentro(p.updated_at ?? p.created_at, j.dias)).length,
    assinaturas: assinaturas.filter(a => dentro(a.created_at, j.dias)).length,
    receita_centavos: pagamentos
      .filter(p => p.status === 'pago' && dentro(p.paid_at ?? p.created_at, j.dias))
      .reduce((s, p) => s + Number(p.amount_cents ?? 0), 0),
    comunidades: grupos.filter(g => dentro(g.created_at, j.dias)).length,
    convites: convites.filter(c => dentro(c.created_at, j.dias)).length,
    convites_aceitos: convites.filter(c => c.status === 'aceito' && dentro(c.created_at, j.dias)).length,
    mensagens: mensagens.filter(m => dentro(m.created_at, j.dias)).length,
  }]))

  const vigente = (a) => ['ativa', 'cancelada'].includes(a.status) &&
                         a.period_end && new Date(a.period_end).getTime() > agora

  const completas = sessoes.filter(s => s.status === 'completed').length

  return json({
    janelas: JANELAS.map(j => j.id),
    dados: janelas,
    // O que nao depende de janela: e o estado de hoje, nao o fluxo do periodo.
    hoje: {
      contas: users.length,
      contas_confirmadas: users.filter(u => u.email_confirmed_at).length,
      assinantes: assinaturas.filter(vigente).length,
      perfis_preenchidos: perfis.filter(preenchido).length,
      questionarios: completas,
      // Taxa de conclusao sobre sessoes iniciadas: e o numero que diz se o
      // questionario esta comprido demais.
      conclusao: sessoes.length ? Number((completas / sessoes.length).toFixed(3)) : null,
      resultados: resultados.length,
      comunidades: grupos.length,
      mensagens_novas: mensagens.filter(m => m.status === 'novo').length,
      receita_centavos: pagamentos.filter(p => p.status === 'pago')
        .reduce((s, p) => s + Number(p.amount_cents ?? 0), 0),
    },
  })
})

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
