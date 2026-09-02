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

  const [curta, longa, { data: familias }] = await Promise.all([
    sb.from('questions').select('id', { count: 'exact', head: true })
      .eq('instrument_id', instrumento.id).eq('in_short', true),
    sb.from('questions').select('id', { count: 'exact', head: true })
      .eq('instrument_id', instrumento.id).eq('in_long', true),
    // Centroides das familias: referencia de fundo do mapa da comunidade, que
    // nao tem um resultado de onde tirar isso. E dado publico do instrumento,
    // nao de ninguem — por isso sai sem login, e sem o conteudo editorial.
    sb.from('archetypes').select('id, name, color, centroid').eq('instrument_id', instrumento.id),
  ])

  // ~13s por pergunta, arredondado para cima: e melhor a pessoa achar que
  // demorou menos do que o anunciado.
  const minutos = n => Math.max(2, Math.ceil((n * 13) / 60))

  return json({
    id: instrumento.id,
    label: instrumento.label,
    curta:    { perguntas: curta.count ?? 0, minutos: minutos(curta.count ?? 0) },
    completa: { perguntas: longa.count ?? 0, minutos: minutos(longa.count ?? 0) },
    familias: familias ?? [],
  })
})
