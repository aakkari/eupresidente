import { exigirAdmin } from './_lib/auth.js'
import { json, erro, corpo } from './_lib/http.js'

// Leitura e edicao do instrumento pelo admin.
//
// A trava central esta aqui: instrumento publicado nao se edita. Se ele ja
// esta ativo, alguem ja respondeu — mudar o texto de uma pergunta faria
// respostas antigas e novas significarem coisas diferentes sob o mesmo id, e
// a base de pesquisa viraria lixo silenciosamente. Ver decisao 8 no CLAUDE.md.
// O caminho para mudar um instrumento publicado e clonar em v2.
export default async (req) => {
  const auth = await exigirAdmin(req)
  if (!auth.ok) return erro(auth.motivo, 401)
  const sb = auth.sb

  if (req.method === 'GET') {
    const id = new URL(req.url).searchParams.get('instrument')
    const { data: instrumentos } = await sb.from('instruments')
      .select('*').order('created_at', { ascending: false })
    const alvo = id || instrumentos?.[0]?.id
    if (!alvo) return json({ instrumentos: [], perguntas: [], arquetipos: [] })

    const [{ data: perguntas }, { data: arquetipos }] = await Promise.all([
      sb.from('questions').select('*').eq('instrument_id', alvo).order('block').order('ord'),
      sb.from('archetypes').select('*').eq('instrument_id', alvo).order('name'),
    ])
    return json({ instrumentos, instrumento_id: alvo, perguntas, arquetipos })
  }

  if (req.method === 'PATCH') {
    const body = await corpo(req)
    if (!body?.id) return erro('id da pergunta obrigatorio')

    const { data: pergunta } = await sb.from('questions')
      .select('id, instrument_id').eq('id', body.id).maybeSingle()
    if (!pergunta) return erro('pergunta nao encontrada', 404)

    const { data: instrumento } = await sb.from('instruments')
      .select('id, active').eq('id', pergunta.instrument_id).single()

    if (instrumento.active)
      return erro('instrumento publicado nao pode ser editado — clone em v2', 409)

    const campos = {}
    for (const c of ['body', 'axis', 'direction', 'weight', 'secondary_axis',
                     'secondary_weight', 'in_short', 'in_long', 'attention_pair', 'scored'])
      if (c in body) campos[c] = body[c]

    if (Object.keys(campos).length === 0) return erro('nada para alterar')

    const { data, error } = await sb.from('questions')
      .update(campos).eq('id', body.id).select().single()
    if (error) return erro(error.message, 400)
    return json(data)
  }

  return erro('metodo nao permitido', 405)
}
