// Servidor de demonstracao. Sobe o app inteiro sem Supabase: le as perguntas e
// os arquetipos direto do seed.sql e roda o motor de scoring de verdade.
// Serve para ver e testar o fluxo; as sessoes vivem em memoria e somem ao
// reiniciar. Nao substitui `netlify dev` com o banco real.
//
//   npm run build && node scripts/dev-server.mjs

import { createServer } from 'node:http'
import { readFileSync, existsSync } from 'node:fs'
import { extname, join } from 'node:path'
import { randomUUID } from 'node:crypto'
import { scoreSession, posicaoPolitica } from '../netlify/functions/_lib/scoring.js'

// --- leitura do seed -------------------------------------------------------

// Divide a lista de valores de um INSERT respeitando aspas, colchetes e
// parenteses aninhados — split(',') quebraria em qualquer texto com virgula.
function separarCampos(linha) {
  const campos = []
  let atual = '', aspas = false, nivel = 0
  for (let i = 0; i < linha.length; i++) {
    const c = linha[i]
    if (aspas) {
      if (c === "'" && linha[i + 1] === "'") { atual += "''"; i++; continue }
      if (c === "'") { aspas = false; atual += c; continue }
      atual += c; continue
    }
    if (c === "'") { aspas = true; atual += c; continue }
    if (c === '(' || c === '[') nivel++
    if (c === ')' || c === ']') nivel--
    if (c === ',' && nivel === 0) { campos.push(atual.trim()); atual = ''; continue }
    atual += c
  }
  campos.push(atual.trim())
  return campos
}

const texto = v => v.startsWith("'") ? v.slice(1, -1).replace(/''/g, "'") : null
const numero = v => v === 'null' ? null : Number(v)
const bool = v => v === 'true'
const jsonb = v => JSON.parse(texto(v.replace(/::jsonb$/, '')))
const lista = v => {
  const m = v.match(/^ARRAY\[(.*)\]$/s)
  return m ? separarCampos(m[1]).map(texto) : []
}

// Isola o corpo de um INSERT e devolve as tuplas de valores, uma por linha.
function tuplas(sql, tabela) {
  const i = sql.indexOf(`insert into ${tabela} (`)
  if (i === -1) return []
  const inicio = sql.indexOf('values', i) + 'values'.length
  let fim = inicio, aspas = false, nivel = 0
  for (; fim < sql.length; fim++) {
    const c = sql[fim]
    if (aspas) { if (c === "'" && sql[fim + 1] === "'") fim++; else if (c === "'") aspas = false; continue }
    if (c === "'") { aspas = true; continue }
    if (c === '(') nivel++
    else if (c === ')') nivel--
    else if (c === ';' && nivel === 0) break
  }
  const corpo = sql.slice(inicio, fim)
  const linhas = []
  let atual = '', aspas2 = false, nivel2 = 0
  for (let k = 0; k < corpo.length; k++) {
    const c = corpo[k]
    if (aspas2) { atual += c; if (c === "'" && corpo[k + 1] === "'") { atual += corpo[++k] } else if (c === "'") aspas2 = false; continue }
    if (c === "'") { aspas2 = true; atual += c; continue }
    if (c === '(') { nivel2++; if (nivel2 === 1) { atual = ''; continue } }
    if (c === ')') { nivel2--; if (nivel2 === 0) { linhas.push(atual); continue } }
    if (nivel2 >= 1) atual += c
  }
  return linhas.map(separarCampos)
}

const sql = readFileSync(new URL('../supabase/seed.sql', import.meta.url), 'utf8')

const instrumentoRaw = tuplas(sql, 'instruments')[0]
const instrumento = {
  id: texto(instrumentoRaw[0]),
  label: texto(instrumentoRaw[1]),
  axes: jsonb(instrumentoRaw[2]),
  facets: instrumentoRaw[4] && instrumentoRaw[4].includes('jsonb') ? jsonb(instrumentoRaw[4]) : {},
  axis_weights: jsonb(instrumentoRaw[3]),
}

const archetypes = tuplas(sql, 'archetypes').map(c => ({
  id: texto(c[0]), instrument_id: texto(c[1]), name: texto(c[2]), tagline: texto(c[3]),
  description: texto(c[4]), schools: lista(c[5]), centroid: jsonb(c[6]),
  available_short: bool(c[7]), color: texto(c[8]),
}))

const questions = tuplas(sql, 'questions').map(c => ({
  id: texto(c[0]), instrument_id: texto(c[1]), block: texto(c[2]), ord: numero(c[3]),
  axis: texto(c[4]), direction: numero(c[5]), weight: numero(c[6]),
  secondary_axis: texto(c[7]), secondary_weight: numero(c[8]), body: texto(c[9]),
  in_short: bool(c[10]), attention_pair: texto(c[11]), scored: true, in_long: true,
}))

// Override local opcional: enquanto o conteudo rico dos perfis vive so no
// banco (ver divida no CLAUDE.md), este arquivo permite renderizar a pagina
// completa em desenvolvimento. Nao versionado, nao usado em producao.
if (process.env.FAMILIAS_JSON && existsSync(process.env.FAMILIAS_JSON)) {
  const extra = JSON.parse(readFileSync(process.env.FAMILIAS_JSON, 'utf8'))
  archetypes.length = 0
  archetypes.push(...extra)
  console.log(`familias vindas de ${process.env.FAMILIAS_JSON}`)
}

console.log(`seed lido: ${questions.length} perguntas, ${archetypes.length} arquetipos`)

// --- estado em memoria -----------------------------------------------------

const sessoes = new Map()

// --- rotas -----------------------------------------------------------------

const json = (res, corpo, status = 200) => {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8' })
  res.end(JSON.stringify(corpo))
}

const rotas = {
  'session-start': (body, _q, res) => {
    const mode = body.mode === 'short' ? 'short' : 'long'
    const token = randomUUID()
    sessoes.set(token, { mode, respostas: {}, resultado: null })
    const perguntas = questions
      .filter(q => mode === 'short' ? q.in_short : q.in_long)
      .map(({ id, block, ord, body: b, axis }) => ({ id, block, ord, body: b, axis }))
    json(res, { token, mode, instrumento, perguntas })
  },

  instrumento: (_body, _q, res) => {
    const curta = questions.filter(q => q.in_short).length
    const longa = questions.filter(q => q.in_long).length
    const minutos = n => Math.max(2, Math.ceil((n * 13) / 60))
    json(res, { id: instrumento.id, label: instrumento.label,
      curta: { perguntas: curta, minutos: minutos(curta) },
      completa: { perguntas: longa, minutos: minutos(longa) } })
  },

  'session-answer': (body, _q, res) => {
    const s = sessoes.get(body.token)
    if (!s) return json(res, { erro: 'sessao nao encontrada' }, 404)
    for (const r of body.respostas) s.respostas[r.question_id] = r.value
    json(res, { gravadas: body.respostas.length })
  },

  'session-finish': (body, _q, res) => {
    const s = sessoes.get(body.token)
    if (!s) return json(res, { erro: 'sessao nao encontrada' }, 404)
    const respondidas = questions.filter(q => s.respostas[q.id] !== undefined)
    s.resultado = {
      ...scoreSession({
        questions: respondidas, answers: s.respostas, archetypes,
        axisWeights: instrumento.axis_weights, mode: s.mode,
      }),
      quality_flags: [],
    }
    json(res, s.resultado)
  },

  'result-get': (_body, q, res) => {
    const s = sessoes.get(q.get('token'))
    if (!s?.resultado) return json(res, { erro: 'resultado ainda nao calculado' }, 404)
    json(res, {
      posicao: posicaoPolitica(s.resultado.vector),
      resultado: s.resultado,
      instrumento,
      arquetipo: archetypes.find(a => a.id === s.resultado.archetype_id) ?? null,
      arquetipo_secundario: archetypes.find(a => a.id === s.resultado.archetype_secondary_id) ?? null,
      todos_arquetipos: archetypes,
    })
  },

  // No modo demo o admin nao autentica: nao existe Supabase Auth aqui. Em
  // producao cada Function confere o token contra ADMIN_EMAILS.
  'admin-instrument': (_body, _q, res) => json(res, {
    instrumentos: [{ ...instrumento, active: false }],
    instrumento_id: instrumento.id, perguntas: questions, arquetipos: archetypes,
  }),

  'admin-metrics': (_body, _q, res) => {
    const resultados = [...sessoes.values()].map(s => s.resultado).filter(Boolean)
    const dist = {}
    for (const r of resultados) dist[r.archetype_id] = (dist[r.archetype_id] ?? 0) + 1
    const cons = {}
    for (const e of ['ECO', 'SOC', 'AUT', 'NAC', 'DEM', 'AMB']) {
      const vs = resultados.map(r => r.consistency?.[e]).filter(v => typeof v === 'number')
      cons[e] = vs.length ? Number((vs.reduce((a, b) => a + b, 0) / vs.length).toFixed(3)) : null
    }
    const neutras = resultados.map(r => r.neutral_rate).filter(Number.isFinite)
    json(res, {
      sessoes: { total: sessoes.size, completas: resultados.length,
                 conclusao: sessoes.size ? Number((resultados.length / sessoes.size).toFixed(3)) : null },
      resultados: resultados.length, research_pool: 0,
      distribuicao_arquetipos: dist, consistencia_por_eixo: cons, quality_flags: {},
      neutral_rate_medio: neutras.length
        ? Number((neutras.reduce((a, b) => a + b, 0) / neutras.length).toFixed(3)) : null,
    })
  },
}

const TIPOS = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
                '.svg': 'image/svg+xml', '.json': 'application/json' }

createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost')

  if (url.pathname.startsWith('/.netlify/functions/')) {
    const nome = url.pathname.split('/').pop()
    const rota = rotas[nome]
    if (!rota) return json(res, { erro: 'rota nao encontrada' }, 404)
    let body = {}
    if (req.method === 'POST') {
      const chunks = []
      for await (const c of req) chunks.push(c)
      try { body = JSON.parse(Buffer.concat(chunks).toString() || '{}') } catch {}
    }
    return rota(body, url.searchParams, res)
  }

  const dist = new URL('../dist', import.meta.url).pathname
  let arquivo = join(dist, url.pathname === '/' ? 'index.html' : url.pathname)
  if (!existsSync(arquivo) || !extname(arquivo)) arquivo = join(dist, 'index.html')
  res.writeHead(200, { 'content-type': TIPOS[extname(arquivo)] ?? 'application/octet-stream' })
  res.end(readFileSync(arquivo))
}).listen(4173, () => console.log('demo em http://localhost:4173'))
