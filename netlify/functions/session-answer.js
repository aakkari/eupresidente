import { admin } from './_lib/supabase.js'
import { json, erro, corpo } from './_lib/http.js'

// Grava respostas em lote. Idempotente por (session_id, question_id), entao
// voltar e mudar a resposta sobrescreve em vez de duplicar.
export default async (req) => {
  if (req.method !== 'POST') return erro('metodo nao permitido', 405)

  const body = await corpo(req)
  if (!body?.token || !Array.isArray(body.respostas)) return erro('token e respostas obrigatorios')

  const sb = admin()
  const { data: sessao } = await sb.from('sessions')
    .select('id, status').eq('token', body.token).maybeSingle()

  if (!sessao) return erro('sessao nao encontrada', 404)
  if (sessao.status !== 'in_progress') return erro('sessao ja encerrada', 409)

  const linhas = body.respostas
    .filter(r => r && typeof r.question_id === 'string'
                 && Number.isInteger(r.value) && r.value >= -2 && r.value <= 2)
    .map(r => ({
      session_id: sessao.id,
      question_id: r.question_id,
      value: r.value,
      // answered_at vem do cliente porque o intervalo entre respostas e o que
      // alimenta a deteccao de resposta apressada. E manipulavel — por isso e
      // heuristica de qualidade, nao criterio de exclusao sozinho.
      answered_at: r.answered_at ?? new Date().toISOString(),
    }))

  if (linhas.length === 0) return erro('nenhuma resposta valida')

  const { error } = await sb.from('responses')
    .upsert(linhas, { onConflict: 'session_id,question_id' })
  if (error) return erro(error.message, 500)

  return json({ gravadas: linhas.length })
}
