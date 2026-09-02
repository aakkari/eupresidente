import { exigirAdmin } from './_lib/auth.js'
import { json, erro, corpo, protegido } from './_lib/http.js'

// O quadro dos resultados possiveis, com o raciocinio tecnico de cada um.
//
// Serve para melhorar o conteudo com o tempo: ver de onde vem cada
// classificacao, quais perfis o instrumento quase nao distingue, quanta gente
// caiu em cada um e o que ainda esta por escrever.
//
// A linha que nao se cruza aqui: o CENTROIDE nao se edita por esta tela.
// Conteudo editorial e texto — mudar uma curiosidade nao muda o resultado de
// ninguem. Centroide e medida: mexer nele reclassifica silenciosamente todo
// mundo que ja respondeu, e o report que a pessoa mandou para os amigos passa
// a dizer outra coisa. Isso e prima da decisao 8, e tem o mesmo motivo.
const EIXOS = ['ECO', 'SOC', 'AUT', 'NAC', 'DEM', 'AMB']

const EDITAVEIS = {
  name: 'texto', tagline: 'texto', description: 'texto', history: 'texto',
  blind_spots: 'texto', schools: 'lista', curiosities: 'lista', figures: 'lista',
  strengths: 'lista', weaknesses: 'lista', countries: 'lista',
}

// O que cada campo de lista precisa ter. Salvar uma curiosidade sem titulo
// deixa um cartao vazio no report de alguem, e ninguem descobre ate ver.
const FORMATO = {
  schools:     [],
  curiosities: ['titulo', 'texto'],
  figures:     ['nome', 'periodo', 'pais', 'nota'],
  strengths:   ['titulo', 'texto'],
  weaknesses:  ['titulo', 'texto'],
  countries:   ['pais', 'forca', 'nota'],
}

export default protegido(async (req) => {
  const auth = await exigirAdmin(req)
  if (!auth.ok) return erro(auth.motivo, 401)
  const sb = auth.sb

  if (req.method === 'GET') {
    const instrumentoId = new URL(req.url).searchParams.get('instrument')

    const { data: instrumentos } = await sb.from('instruments')
      .select('id, label, axes, active').order('created_at', { ascending: false })
    const alvo = instrumentoId || instrumentos?.find(i => i.active)?.id || instrumentos?.[0]?.id
    if (!alvo) return json({ instrumentos: [], perfis: [] })

    const [{ data: arquetipos }, { data: resultados }] = await Promise.all([
      sb.from('archetypes').select('*').eq('instrument_id', alvo).order('name'),
      sb.from('results').select('archetype_id, archetype_secondary_id').eq('instrument_id', alvo),
    ])

    const quantos = {}
    const comoSegundo = {}
    for (const r of resultados ?? []) {
      quantos[r.archetype_id] = (quantos[r.archetype_id] ?? 0) + 1
      if (r.archetype_secondary_id)
        comoSegundo[r.archetype_secondary_id] = (comoSegundo[r.archetype_secondary_id] ?? 0) + 1
    }

    const perfis = (arquetipos ?? []).map(a => ({
      ...a,
      pessoas: quantos[a.id] ?? 0,
      como_segundo: comoSegundo[a.id] ?? 0,
      tecnico: tecnico(a, arquetipos ?? []),
      falta: Object.keys(EDITAVEIS).filter(c => vazio(a[c])),
    }))

    return json({
      instrumentos: instrumentos ?? [], instrumento_id: alvo,
      eixos: instrumentos?.find(i => i.id === alvo)?.axes ?? {},
      perfis,
      // Os pares que o instrumento quase nao separa. E a lista de onde investir
      // pergunta nova: dois centroides colados significam que a diferenca entre
      // as duas tradicoes nao esta sendo perguntada.
      pares_proximos: paresProximos(arquetipos ?? []),
      campos: EDITAVEIS, formato: FORMATO,
    })
  }

  if (req.method === 'PATCH') {
    const body = await corpo(req) || {}
    const id = String(body.id ?? '')
    if (!id) return erro('id do perfil obrigatorio')

    const { data: atual } = await sb.from('archetypes').select('id').eq('id', id).maybeSingle()
    if (!atual) return erro('perfil nao encontrado', 404)

    const campos = {}
    for (const [campo, tipo] of Object.entries(EDITAVEIS)) {
      if (!(campo in body)) continue
      if (tipo === 'texto') {
        campos[campo] = String(body[campo] ?? '').trim() || null
      } else {
        const valor = body[campo]
        if (!Array.isArray(valor)) return erro(`${campo} precisa ser uma lista`)
        const exigidos = FORMATO[campo] ?? []
        for (const item of valor) {
          if (exigidos.length && (typeof item !== 'object' || item === null))
            return erro(`cada item de ${campo} precisa ser um objeto`)
          for (const chave of exigidos) {
            if (!String(item?.[chave] ?? '').trim())
              return erro(`item de ${campo} sem "${chave}"`)
          }
        }
        campos[campo] = valor
      }
    }

    if (!Object.keys(campos).length) return erro('nada para gravar')

    // centroid, id e instrument_id nao entram nem se vierem no corpo: sao
    // medida, nao texto.
    const { error } = await sb.from('archetypes').update(campos).eq('id', id)
    if (error) return erro(error.message, 400)
    return json({ ok: true })
  }

  return erro('metodo nao permitido', 405)
})

const vazio = (v) => v == null || v === '' || (Array.isArray(v) && !v.length)

const distancia = (a, b) =>
  Math.sqrt(EIXOS.reduce((s, e) =>
    s + (Number(a.centroid?.[e] ?? 0) - Number(b.centroid?.[e] ?? 0)) ** 2, 0))

// O raciocinio por tras de um perfil: o que o define, quem e o vizinho e o que
// separa os dois.
function tecnico(a, todos) {
  const define = EIXOS
    .map(e => ({ eixo: e, valor: Number(a.centroid?.[e] ?? 0) }))
    .sort((x, y) => Math.abs(y.valor) - Math.abs(x.valor))

  const vizinhos = todos
    .filter(o => o.id !== a.id)
    .map(o => ({
      id: o.id, nome: o.name, d: Number(distancia(a, o).toFixed(3)),
      // O eixo que mais separa os dois: e nele que uma pergunta nova decide
      // entre um e outro.
      separa: EIXOS
        .map(e => ({ eixo: e, delta: Math.abs(Number(a.centroid?.[e] ?? 0) - Number(o.centroid?.[e] ?? 0)) }))
        .sort((x, y) => y.delta - x.delta)[0],
    }))
    .sort((x, y) => x.d - y.d)
    .slice(0, 3)

  return {
    // Eixos com |valor| >= 0.5 sao o que a pessoa tem que marcar forte para
    // cair aqui; abaixo disso o eixo nao esta dizendo nada sobre este perfil.
    define: define.filter(d => Math.abs(d.valor) >= 0.5),
    indiferente: define.filter(d => Math.abs(d.valor) < 0.2).map(d => d.eixo),
    vizinhos,
  }
}

function paresProximos(todos) {
  const pares = []
  for (let i = 0; i < todos.length; i++) {
    for (let j = i + 1; j < todos.length; j++) {
      pares.push({
        a: todos[i].name, b: todos[j].name,
        d: Number(distancia(todos[i], todos[j]).toFixed(3)),
        separa: EIXOS
          .map(e => ({ eixo: e,
            delta: Number(Math.abs(Number(todos[i].centroid?.[e] ?? 0) -
                                   Number(todos[j].centroid?.[e] ?? 0)).toFixed(2)) }))
          .sort((x, y) => y.delta - x.delta)[0],
      })
    }
  }
  return pares.sort((x, y) => x.d - y.d).slice(0, 8)
}
