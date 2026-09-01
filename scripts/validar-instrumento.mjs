// Teste de recuperacao do instrumento.
//
// Simula, para cada arquetipo, uma pessoa que responde exatamente de acordo
// com o centroide dele, e verifica se o motor devolve aquele arquetipo de
// volta. Arquetipo que nao se recupera esta mal posicionado: nenhuma resposta
// possivel leva ate ele, e ele nunca vai aparecer para ninguem.
//
// Uso:
//   node scripts/validar-instrumento.mjs                 (busca do Supabase)
//   node scripts/validar-instrumento.mjs dados.json      (usa um dump local)

import { readFileSync } from 'node:fs'
import { scoreSession, EIXOS } from '../netlify/functions/_lib/scoring.js'

const arquivo = process.argv[2]
let dados

if (arquivo) {
  dados = JSON.parse(readFileSync(arquivo, 'utf8'))
} else {
  const { createClient } = await import('@supabase/supabase-js')
  const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
  const inst = process.env.INSTRUMENT_ID || 'br-v1'
  const [q, a, i] = await Promise.all([
    sb.from('questions').select('*').eq('instrument_id', inst),
    sb.from('archetypes').select('*').eq('instrument_id', inst),
    sb.from('instruments').select('axis_weights').eq('id', inst).single(),
  ])
  dados = { questions: q.data, archetypes: a.data, axis_weights: i.data.axis_weights }
}

const { questions, archetypes, axis_weights } = dados
const limita = v => Math.max(-2, Math.min(2, v))

// Uma pessoa "ideal" daquele arquetipo: em cada pergunta responde na
// intensidade que o centroide dela indica, ja corrigida a inversao do item.
function responderComo(centroide, perguntas) {
  const respostas = {}
  for (const q of perguntas) {
    if (!q.scored) continue
    respostas[q.id] = limita(Math.round(Number(centroide[q.axis] ?? 0) * q.direction * 2))
  }
  return respostas
}

function rodar(modo) {
  const perguntas = modo === 'short' ? questions.filter(q => q.in_short) : questions
  const elegiveis = archetypes.filter(a => modo === 'long' || a.available_short)
  const falhas = []

  for (const alvo of elegiveis) {
    const r = scoreSession({
      questions: perguntas,
      answers: responderComo(alvo.centroid, perguntas),
      archetypes,
      axisWeights: axis_weights,
      mode: modo,
    })
    const ok = r.archetype_id === alvo.id
    if (!ok) falhas.push({ alvo: alvo.id, veio: r.archetype_id, dist: r.archetype_distance })
    console.log(`${ok ? 'ok  ' : 'FALHA'} ${alvo.id.padEnd(30)} -> ${r.archetype_id}`)
  }

  console.log(`\n${modo}: ${elegiveis.length - falhas.length}/${elegiveis.length} recuperados`)
  return falhas
}

console.log('=== versao longa ===')
const fLong = rodar('long')
console.log('\n=== versao curta ===')
const fShort = rodar('short')

if (fLong.length) {
  console.log('\nCentroides inalcancaveis na versao longa:')
  for (const f of fLong) console.log(` - ${f.alvo} caiu em ${f.veio}`)
  process.exitCode = 1
}
