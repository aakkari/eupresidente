import { admin } from './_lib/supabase.js'
import { json, erro, corpo, protegido } from './_lib/http.js'

// Grava respostas em lote, via funcao SQL. Idempotente por (sessao, pergunta),
// entao voltar e mudar a resposta sobrescreve em vez de duplicar.
//
// A gravacao passa por RPC e nao pelo upsert do PostgREST: responses e
// particionada, o ON CONFLICT roda no banco em uma unica round-trip, e o
// question_id e validado contra o instrumento em vez de estourar a FK.
export default protegido(async (req) => {
  if (req.method !== 'POST') return erro('metodo nao permitido', 405)

  const body = await corpo(req)
  if (!body?.token || !Array.isArray(body.respostas))
    return erro('token e respostas obrigatorios')

  const respostas = body.respostas.filter(r =>
    r && typeof r.question_id === 'string' &&
    Number.isInteger(r.value) && r.value >= -2 && r.value <= 2)

  if (respostas.length === 0) return erro('nenhuma resposta valida')

  try {
    const sb = admin()
    const { data, error } = await sb.rpc('save_responses', {
      p_token: body.token,
      p_respostas: respostas,
    })
    if (error) return erro(error.message, 400)
    return json({ gravadas: data ?? respostas.length })
  } catch (e) {
    // Sem isto, uma excecao aqui derruba a Function sem resposta e o browser
    // so mostra "Failed to fetch", que nao diz nada a ninguem.
    return erro(`falha ao gravar: ${e.message}`, 500)
  }
})
