import { admin } from './_lib/supabase.js'
import { json, erro, protegido } from './_lib/http.js'

// Resumo do instrumento ativo, para a home anunciar os numeros certos.
//
// Existe porque a home tinha "16 perguntas" escrito a mao no codigo: o
// instrumento foi trocado no banco e a vitrine continuou anunciando o
// tamanho antigo. Numero de conteudo em texto fixo diverge — sempre.
export default protegido(async (req) => {
  const sb = admin()
  const { data: instrumento } = await sb.from('instruments')
    .select('id, label').eq('active', true)
    .order('created_at', { ascending: false }).limit(1).maybeSingle()

  if (!instrumento) return erro('nenhum instrumento publicado', 503)

  const [curta, longa] = await Promise.all([
    sb.from('questions').select('id', { count: 'exact', head: true })
      .eq('instrument_id', instrumento.id).eq('in_short', true),
    sb.from('questions').select('id', { count: 'exact', head: true })
      .eq('instrument_id', instrumento.id).eq('in_long', true),
  ])

  // ~13s por pergunta, arredondado para cima: e melhor a pessoa achar que
  // demorou menos do que o anunciado.
  const minutos = n => Math.max(2, Math.ceil((n * 13) / 60))

  return json({
    id: instrumento.id,
    label: instrumento.label,
    curta:    { perguntas: curta.count ?? 0, minutos: minutos(curta.count ?? 0) },
    completa: { perguntas: longa.count ?? 0, minutos: minutos(longa.count ?? 0) },
  })
})
