import { exigirUsuario } from './_lib/auth.js'
import { json, erro, protegido } from './_lib/http.js'
import { posicaoPolitica } from './_lib/scoring.js'

// Resultados que a pessoa vinculou a propria conta.
//
// Sai daqui o suficiente para a lista desenhar o card e o botao de enviar sem
// precisar abrir cada report: nome, tagline e cor da familia, mais a posicao.
// Nao sai o conteudo editorial — para isso existe o report, com trava.
export default protegido(async (req) => {
  const auth = await exigirUsuario(req)
  if (!auth.ok) return erro(auth.motivo, 401)

  const { data: sessoes } = await auth.sb.from('sessions')
    .select('id, token, mode, completed_at, instrument_id')
    .eq('user_id', auth.uid).eq('status', 'completed')
    .order('completed_at', { ascending: false }).limit(200)

  if (!sessoes?.length) return json({ resultados: [] })

  const [{ data: resultados }, { data: familias }] = await Promise.all([
    auth.sb.from('results').select('id, session_id, vector, archetype_id, computed_at')
      .in('session_id', sessoes.map(s => s.id)),
    auth.sb.from('archetypes').select('id, name, tagline, color'),
  ])

  const porFamilia = Object.fromEntries((familias ?? []).map(a => [a.id, a]))
  const porSessao = Object.fromEntries(sessoes.map(s => [s.id, s]))

  return json({
    resultados: (resultados ?? [])
      .map(r => {
        const s = porSessao[r.session_id]
        const f = porFamilia[r.archetype_id]
        return {
          token: s?.token, mode: s?.mode, quando: r.computed_at,
          familia: f?.name ?? r.archetype_id,
          tagline: f?.tagline ?? null,
          cor: f?.color ?? '#0a0a0b',
          vector: r.vector,
          // Calculada aqui e nao no front: a formula mora no servidor, junto
          // com o resto do motor.
          posicao: posicaoPolitica(r.vector),
        }
      })
      .sort((a, b) => new Date(b.quando) - new Date(a.quando)),
  })
})
