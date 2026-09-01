import { admin } from './_lib/supabase.js'
import { json, erro, protegido } from './_lib/http.js'
import { posicaoPolitica } from './_lib/scoring.js'

// Le o resultado pelo token da sessao. O token e a credencial: quem tem o
// link ve o resultado. E por isso que ele e uuid v4 e nao um id sequencial.
export default protegido(async (req) => {
  const token = new URL(req.url).searchParams.get('token')
  if (!token) return erro('token obrigatorio')

  const sb = admin()
  const { data: sessao } = await sb.from('sessions')
    .select('id, mode, instrument_id').eq('token', token).maybeSingle()
  if (!sessao) return erro('sessao nao encontrada', 404)

  const { data: resultado } = await sb.from('results')
    .select('*').eq('session_id', sessao.id).maybeSingle()
  if (!resultado) return erro('resultado ainda nao calculado', 404)

  const [{ data: arquetipos }, { data: instrumento }] = await Promise.all([
    sb.from('archetypes').select('*').eq('instrument_id', sessao.instrument_id),
    sb.from('instruments').select('label, axes, facets').eq('id', sessao.instrument_id).single(),
  ])

  return json({
    // Calculado na leitura, nao gravado: e deterministico a partir do vetor,
    // entao persistir seria uma copia que pode divergir da formula.
    posicao: posicaoPolitica(resultado.vector),
    resultado,
    instrumento,
    arquetipo: arquetipos.find(a => a.id === resultado.archetype_id) ?? null,
    arquetipo_secundario: arquetipos.find(a => a.id === resultado.archetype_secondary_id) ?? null,
    todos_arquetipos: arquetipos,
  })
})
