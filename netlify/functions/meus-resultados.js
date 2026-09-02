import { admin } from './_lib/supabase.js'
import { json, erro, protegido } from './_lib/http.js'
import { posicaoPolitica } from './_lib/scoring.js'

// Resultados que a pessoa vinculou a propria conta.
export default protegido(async (req) => {
  const header = req.headers.get('authorization') || ''
  const jwt = header.startsWith('Bearer ') ? header.slice(7) : null
  if (!jwt) return erro('login obrigatorio', 401)

  const sb = admin()
  const { data: auth, error: eAuth } = await sb.auth.getUser(jwt)
  if (eAuth || !auth?.user) return erro('login invalido', 401)

  const { data: sessoes } = await sb.from('sessions')
    .select('id, token, mode, completed_at, instrument_id')
    .eq('user_id', auth.user.id).eq('status', 'completed')
    .order('completed_at', { ascending: false }).limit(50)

  if (!sessoes?.length) return json({ resultados: [] })

  const [{ data: resultados }, { data: familias }] = await Promise.all([
    sb.from('results').select('id, session_id, vector, archetype_id, computed_at')
      .in('session_id', sessoes.map(s => s.id)),
    sb.from('archetypes').select('id, name, color'),
  ])

  const porFamilia = Object.fromEntries((familias ?? []).map(a => [a.id, a]))

  return json({
    resultados: (resultados ?? []).map(r => {
      const s = sessoes.find(x => x.id === r.session_id)
      const f = porFamilia[r.archetype_id]
      return {
        token: s?.token, mode: s?.mode, quando: r.computed_at,
        familia: f?.name ?? r.archetype_id, cor: f?.color ?? '#0a0a0b',
        vector: r.vector,
        // Calculada aqui e nao no front: a formula mora no servidor, junto
        // com o resto do motor.
        posicao: posicaoPolitica(r.vector),
      }
    }),
  })
})
