import { admin } from './_lib/supabase.js'
import { json, erro, corpo, protegido } from './_lib/http.js'
import { scoreSession } from './_lib/scoring.js'

// Fecha a sessao e calcula o resultado. Deterministico do inicio ao fim.
export default protegido(async (req) => {
  if (req.method !== 'POST') return erro('metodo nao permitido', 405)

  const body = await corpo(req)
  if (!body?.token) return erro('token obrigatorio')

  const sb = admin()
  const { data: sessao } = await sb.from('sessions')
    .select('id, status, mode, instrument_id, user_id').eq('token', body.token).maybeSingle()
  if (!sessao) return erro('sessao nao encontrada', 404)

  // Ja calculado: devolve o mesmo resultado em vez de recalcular. Recalcular
  // seria inofensivo (e deterministico), mas gastaria banco a cada F5.
  const { data: existente } = await sb.from('results')
    .select('*').eq('session_id', sessao.id).maybeSingle()
  if (existente) return json({ result_id: existente.id, ...existente })

  const [{ data: perguntas }, { data: arquetipos }, { data: instrumento }, { data: respostas }] =
    await Promise.all([
      sb.from('questions')
        .select('id, axis, facet, direction, weight, secondary_axis, secondary_weight, scored')
        .eq('instrument_id', sessao.instrument_id),
      sb.from('archetypes')
        .select('id, centroid, available_short').eq('instrument_id', sessao.instrument_id),
      sb.from('instruments').select('axis_weights').eq('id', sessao.instrument_id).single(),
      sb.from('responses').select('question_id, value').eq('session_id', sessao.id),
    ])

  if (!respostas?.length) return erro('sessao sem respostas', 409)

  const answers = Object.fromEntries(respostas.map(r => [r.question_id, r.value]))
  const respondidas = perguntas.filter(q => answers[q.id] !== undefined)
  const score = scoreSession({
    questions: respondidas,
    answers,
    archetypes: arquetipos,
    axisWeights: instrumento.axis_weights,
    mode: sessao.mode,
  })

  if (!score.archetype_id) return erro('nao foi possivel classificar', 422)

  await sb.from('sessions')
    .update({ status: 'completed', completed_at: new Date().toISOString() })
    .eq('id', sessao.id)

  const { data: flags } = await sb.rpc('detect_quality_flags', { p_session_id: sessao.id })
  const quality = flags ?? []

  // Elegibilidade para pesquisa exige tres coisas: versao longa (decisao 3),
  // consentimento especifico para pesquisa (LGPD art. 11) e resposta limpa.
  const elegivel = sessao.mode === 'long' && quality.length === 0 && body.consentimento_pesquisa === true

  const { data: resultado, error } = await sb.from('results').insert({
    session_id: sessao.id,
    instrument_id: sessao.instrument_id,
    vector: score.vector,
    facet_vector: score.facet_vector,
    confidence: score.confidence,
    consistency: score.consistency,
    neutral_rate: score.neutral_rate,
    archetype_id: score.archetype_id,
    archetype_secondary_id: score.archetype_secondary_id,
    archetype_distance: score.archetype_distance,
    tensions: score.tensions,
    quality_flags: quality,
    quality_metrics: { respondidas: respondidas.length, total: perguntas.length },
    research_eligible: elegivel,
  }).select().single()

  if (error) return erro(error.message, 500)

  // Perfil de quem ja comecou logado. Antes ele so nascia em session-claim,
  // porque toda sessao nascia orfa e passava por la. Agora quem responde
  // logado nunca vincula nada — e ficaria para sempre sem nome, inclusive no
  // mapa da comunidade, onde o nome e o ponto todo.
  //
  // Dentro de try: isto roda depois de o resultado ja estar gravado, e ficar
  // sem apelido e um arranhao. Deixar escapar aqui derrubaria a resposta de
  // quem acabou de responder noventa perguntas — o perfil nao vale isso.
  if (sessao.user_id) {
    try {
      const { data: perfil } = await sb.from('profiles')
        .select('user_id').eq('user_id', sessao.user_id).maybeSingle()
      if (!perfil) {
        const { data: dono } = await sb.auth.admin.getUserById(sessao.user_id)
        const nome = dono?.user?.user_metadata?.display_name
          || dono?.user?.email?.split('@')[0] || null
        await sb.from('profiles')
          .insert({ user_id: sessao.user_id, display_name: nome?.slice(0, 60) ?? null })
      }
    } catch { /* segue: o resultado ja existe */ }
  }

  if (body.consentimento_pesquisa === true) {
    await sb.from('consents').insert({
      session_id: sessao.id,
      purpose: 'pesquisa_agregada',
      granted: true,
      policy_version: body.policy_version || 'v1',
    })
  }

  if (elegivel) {
    await sb.rpc('ingest_research', {
      p_result_id: resultado.id,
      p_demographics: body.demografia ?? {},
    })
  }

  return json({ result_id: resultado.id, ...resultado })
})
