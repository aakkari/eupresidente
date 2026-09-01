import { exigirAdmin } from './_lib/auth.js'
import { json, erro, protegido } from './_lib/http.js'

// Painel de avaliacao do instrumento. Estas sao as metricas que dizem se as
// perguntas estao funcionando — nao quantas pessoas responderam.
export default protegido(async (req) => {
  const auth = await exigirAdmin(req)
  if (!auth.ok) return erro(auth.motivo, 401)
  const sb = auth.sb

  const [{ data: sessoes }, { data: resultados }, { count: nPesquisa }] = await Promise.all([
    sb.from('sessions').select('id, mode, status'),
    sb.from('results').select('archetype_id, vector, consistency, neutral_rate, quality_flags, tensions'),
    sb.from('research_pool').select('id', { count: 'exact', head: true }),
  ])

  const total = sessoes?.length ?? 0
  const completas = sessoes?.filter(s => s.status === 'completed').length ?? 0
  const res = resultados ?? []

  // Distribuicao de arquetipos: se um deles nunca aparece, o centroide esta
  // mal posicionado ou nao existe gente ali. Se um leva quase tudo, o
  // instrumento nao esta discriminando.
  const porArquetipo = {}
  for (const r of res) porArquetipo[r.archetype_id] = (porArquetipo[r.archetype_id] ?? 0) + 1

  // Consistencia media por eixo. Eixo consistentemente baixo significa
  // perguntas invertidas mal redigidas — a pessoa nao entendeu que era o
  // contrario, e o eixo esta medindo leitura, nao opiniao.
  const eixos = ['ECO', 'SOC', 'AUT', 'NAC', 'DEM', 'AMB']
  const consistenciaPorEixo = {}
  for (const eixo of eixos) {
    const vs = res.map(r => r.consistency?.[eixo]).filter(v => typeof v === 'number')
    consistenciaPorEixo[eixo] = vs.length ? Number((vs.reduce((s, v) => s + v, 0) / vs.length).toFixed(3)) : null
  }

  const flags = {}
  for (const r of res) for (const f of (r.quality_flags ?? [])) flags[f] = (flags[f] ?? 0) + 1

  const neutras = res.map(r => Number(r.neutral_rate)).filter(Number.isFinite)

  return json({
    sessoes: { total, completas, conclusao: total ? Number((completas / total).toFixed(3)) : null },
    resultados: res.length,
    research_pool: nPesquisa ?? 0,
    distribuicao_arquetipos: porArquetipo,
    consistencia_por_eixo: consistenciaPorEixo,
    quality_flags: flags,
    neutral_rate_medio: neutras.length
      ? Number((neutras.reduce((s, v) => s + v, 0) / neutras.length).toFixed(3)) : null,
  })
})
