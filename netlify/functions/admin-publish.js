import { exigirAdmin } from './_lib/auth.js'
import { json, erro, corpo } from './_lib/http.js'

// Duas operacoes de ciclo de vida do instrumento.
//
// publicar: liga active. A partir dai o instrumento e imutavel.
// clonar:   cria a proxima versao a partir de uma publicada, copiando
//           perguntas e arquetipos com novos ids prefixados. A v2 nasce
//           inativa e editavel; a v1 continua no ar ate voce trocar.
export default async (req) => {
  if (req.method !== 'POST') return erro('metodo nao permitido', 405)
  const auth = await exigirAdmin(req)
  if (!auth.ok) return erro(auth.motivo, 401)
  const sb = auth.sb

  const body = await corpo(req)
  if (!body?.instrument_id || !body?.acao) return erro('instrument_id e acao obrigatorios')

  const { data: origem } = await sb.from('instruments')
    .select('*').eq('id', body.instrument_id).maybeSingle()
  if (!origem) return erro('instrumento nao encontrado', 404)

  if (body.acao === 'publicar') {
    const { count } = await sb.from('questions')
      .select('id', { count: 'exact', head: true }).eq('instrument_id', origem.id)
    if (!count) return erro('instrumento sem perguntas', 409)

    // Um instrumento ativo por vez: o front pega o ativo mais recente, e dois
    // ativos tornariam imprevisivel qual questionario a pessoa recebe.
    await sb.from('instruments').update({ active: false }).neq('id', origem.id)
    const { data, error } = await sb.from('instruments')
      .update({ active: true }).eq('id', origem.id).select().single()
    if (error) return erro(error.message, 500)
    return json({ publicado: data })
  }

  if (body.acao === 'clonar') {
    const novoId = (body.novo_id || '').trim()
    if (!novoId) return erro('novo_id obrigatorio')

    const { data: existe } = await sb.from('instruments')
      .select('id').eq('id', novoId).maybeSingle()
    if (existe) return erro('ja existe instrumento com esse id', 409)

    const { error: eInst } = await sb.from('instruments').insert({
      id: novoId,
      label: body.label || `${origem.label} (v2)`,
      axes: origem.axes,
      axis_weights: origem.axis_weights,
      active: false,
    })
    if (eInst) return erro(eInst.message, 500)

    const [{ data: perguntas }, { data: arquetipos }] = await Promise.all([
      sb.from('questions').select('*').eq('instrument_id', origem.id),
      sb.from('archetypes').select('*').eq('instrument_id', origem.id),
    ])

    // Prefixo no id evita colisao com a versao anterior e deixa obvio, no
    // dado bruto, de qual versao cada resposta veio.
    const pref = s => `${novoId}:${s}`

    if (arquetipos?.length) {
      const { error } = await sb.from('archetypes').insert(
        arquetipos.map(a => ({ ...a, id: pref(a.id), instrument_id: novoId })))
      if (error) return erro(error.message, 500)
    }
    if (perguntas?.length) {
      const { error } = await sb.from('questions').insert(
        perguntas.map(q => ({ ...q, id: pref(q.id), instrument_id: novoId })))
      if (error) return erro(error.message, 500)
    }

    return json({
      clonado: novoId,
      perguntas: perguntas?.length ?? 0,
      arquetipos: arquetipos?.length ?? 0,
    })
  }

  return erro('acao invalida')
}
