import { exigirUsuario } from './_lib/auth.js'
import { json, erro, corpo, protegido } from './_lib/http.js'
import { posicaoPolitica } from './_lib/scoring.js'

// Levar os dados embora, e apagar a conta.
//
// As duas coisas moram juntas de proposito: quem vai apagar precisa poder
// baixar antes. Direito de acesso e de eliminacao sao o mesmo artigo da LGPD,
// e separar em duas telas so faz a pessoa perder o que era dela.
export default protegido(async (req) => {
  const auth = await exigirUsuario(req)
  if (!auth.ok) return erro(auth.motivo, 401)
  const { sb, uid, user } = auth

  if (req.method === 'GET') return await exportar(sb, uid, user)

  if (req.method === 'DELETE') {
    const body = await corpo(req) || {}

    // Confirmacao digitada. Um botao "tem certeza?" e clicado no automatico;
    // digitar a palavra obriga a ler o que esta sendo feito.
    if (String(body.confirmacao ?? '').trim().toUpperCase() !== 'APAGAR')
      return erro('digite APAGAR para confirmar', 400)

    const { error } = await sb.rpc('purge_user', { p_user_id: uid })
    if (error) return erro(error.message, 400)

    // O RPC ja apagou a linha de auth.users. A chamada abaixo e a rede: se por
    // algum motivo a conta sobreviver, ela some aqui, e um erro de "nao
    // encontrado" e exatamente o resultado esperado.
    await sb.auth.admin.deleteUser(uid).catch(() => {})

    return json({ ok: true })
  }

  return erro('metodo nao permitido', 405)
})

async function exportar(sb, uid, user) {
  const [{ data: perfil }, { data: sessoes }, { data: consentimentos },
         { data: assinatura }, { data: pagamentos }, { data: membros }] = await Promise.all([
    sb.from('profiles').select('*').eq('user_id', uid).maybeSingle(),
    sb.from('sessions').select('id, token, mode, status, started_at, completed_at')
      .eq('user_id', uid).order('started_at'),
    sb.from('consents').select('purpose, granted, policy_version, granted_at, revoked_at')
      .eq('user_id', uid),
    sb.from('subscriptions').select('*').eq('user_id', uid).maybeSingle(),
    sb.from('payments').select('amount_cents, currency, status, method, paid_at, created_at')
      .eq('user_id', uid),
    sb.from('group_members').select('group_id, shared, joined_at').eq('user_id', uid),
  ])

  const ids = (sessoes ?? []).map(s => s.id)
  const [{ data: resultados }, { data: respostas }, { data: grupos }] = await Promise.all([
    ids.length ? sb.from('results').select('*').in('session_id', ids) : { data: [] },
    ids.length ? sb.from('responses').select('session_id, question_id, value, answered_at')
                   .in('session_id', ids) : { data: [] },
    membros?.length ? sb.from('groups').select('id, name').in('id', membros.map(m => m.group_id))
                    : { data: [] },
  ])

  return json({
    gerado_em: new Date().toISOString(),
    conta: { email: user.email, criada_em: user.created_at, ultimo_acesso: user.last_sign_in_at },
    perfil: perfil ?? null,
    consentimentos: consentimentos ?? [],
    assinatura: assinatura ?? null,
    pagamentos: pagamentos ?? [],
    comunidades: (membros ?? []).map(m => ({
      nome: (grupos ?? []).find(g => g.id === m.group_id)?.name ?? null,
      aparece_no_mapa: m.shared, desde: m.joined_at,
    })),
    questionarios: (sessoes ?? []).map(s => {
      const r = (resultados ?? []).find(x => x.session_id === s.id)
      return {
        quando: s.completed_at ?? s.started_at,
        versao: s.mode === 'short' ? 'rapida' : 'completa',
        status: s.status,
        link: s.status === 'completed' ? `/resultado?token=${s.token}` : null,
        posicao: r ? posicaoPolitica(r.vector) : null,
        vetor: r?.vector ?? null,
        facetas: r?.facet_vector ?? null,
        confianca: r?.confidence ?? null,
        familia: r?.archetype_id ?? null,
        // As respostas cruas: e o dado bruto que a pessoa deu, e e dela.
        respostas: (respostas ?? [])
          .filter(x => x.session_id === s.id)
          .map(x => ({ pergunta: x.question_id, valor: x.value, quando: x.answered_at })),
      }
    }),
    // Dito no proprio arquivo, e nao so na tela: quem abrir isto daqui a um ano
    // precisa saber o que nao esta aqui.
    observacao: 'A base de pesquisa e anonima e nao guarda ligacao com a sua conta. ' +
      'Por isso as linhas que estao la nao aparecem neste arquivo, nem podem ser ' +
      'localizadas por pessoa — nem por nos.',
  })
}
