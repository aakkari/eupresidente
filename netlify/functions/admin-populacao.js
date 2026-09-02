import { exigirAdmin } from './_lib/auth.js'
import { json, erro, protegido } from './_lib/http.js'
import { posicaoPolitica } from './_lib/scoring.js'

// A populacao: onde as pessoas caem, e como isso muda por recorte.
//
// Aqui e leitura interna do responsavel pelos dados, nao publicacao. A celula
// minima de 100 da decisao 7 vale para o que sai daqui para fora — um recorte
// por municipio publicado reidentifica. Por isso os recortes vem com o n
// sempre visivel e marcados quando a amostra e pequena: o numero aparece, mas
// nao aparece sozinho, fingindo que significa alguma coisa.
const PISO_CONFIAVEL = 30
const EIXOS = ['ECO', 'SOC', 'AUT', 'NAC', 'DEM', 'AMB']

export default protegido(async (req) => {
  const auth = await exigirAdmin(req)
  if (!auth.ok) return erro(auth.motivo, 401)
  const sb = auth.sb

  const [{ data: sessoes }, { data: resultados }, { data: perfis }, { data: familias }] =
    await Promise.all([
      sb.from('sessions').select('id, user_id, mode, status, started_at, completed_at'),
      sb.from('results').select('session_id, vector, archetype_id, computed_at'),
      sb.from('profiles').select('user_id, uf, city, education, occupation, birth_year'),
      sb.from('archetypes').select('id, name'),
    ])

  const porSessao = Object.fromEntries((sessoes ?? []).map(s => [s.id, s]))
  const porPerfil = Object.fromEntries((perfis ?? []).map(p => [p.user_id, p]))
  const porFamilia = Object.fromEntries((familias ?? []).map(a => [a.id, a.name]))

  // Uma linha por resultado, ja com a posicao calculada e o recorte colado.
  const linhas = (resultados ?? []).map(r => {
    const s = porSessao[r.session_id]
    const p = s?.user_id ? porPerfil[s.user_id] : null
    const pos = posicaoPolitica(r.vector)
    return {
      posicao: pos.posicao, rotulo: pos.rotulo,
      economia: pos.economia_1_100, costumes: pos.costumes_1_100,
      familia: porFamilia[r.archetype_id] ?? r.archetype_id,
      vector: r.vector, mode: s?.mode ?? null, quando: r.computed_at,
      uf: p?.uf ?? null,
      escolaridade: p?.education ?? null,
      ocupacao: p?.occupation ?? null,
      faixa_etaria: faixaEtaria(p?.birth_year),
    }
  })

  return json({
    total: linhas.length,
    // Dez baldes de dez: a curva do 1-100 e a primeira coisa que diz se o
    // instrumento esta empilhando gente no centro.
    escala: baldes(linhas.map(l => l.posicao)),
    por_rotulo: contar(linhas, l => l.rotulo),
    por_familia: contar(linhas, l => l.familia),
    por_versao: contar(linhas, l => l.mode === 'short' ? 'rápida' : 'completa'),
    media_eixos: Object.fromEntries(EIXOS.map(e => [
      e, media(linhas.map(l => Number(l.vector?.[e])).filter(Number.isFinite)),
    ])),
    recortes: {
      uf: recorte(linhas, 'uf'),
      escolaridade: recorte(linhas, 'escolaridade'),
      ocupacao: recorte(linhas, 'ocupacao'),
      faixa_etaria: recorte(linhas, 'faixa_etaria'),
    },
    // Quantos resultados nem entram nos recortes por falta de perfil
    // preenchido. Sem isso, um recorte com 4 pessoas parece a populacao toda.
    sem_perfil: linhas.filter(l => !l.uf && !l.escolaridade && !l.ocupacao && !l.faixa_etaria).length,
    piso_confiavel: PISO_CONFIAVEL,
    tempo: await tempos(sb, sessoes ?? []),
  })
})

const media = (ns) => ns.length ? Number((ns.reduce((s, v) => s + v, 0) / ns.length).toFixed(3)) : null

// Sem arredondar: quem chama decide a precisao. Segundos de sessao pedem
// inteiro; segundos por pergunta pedem uma casa.
const mediana = (ns) => {
  if (!ns.length) return null
  const o = [...ns].sort((a, b) => a - b)
  const m = Math.floor(o.length / 2)
  return o.length % 2 ? o[m] : (o[m - 1] + o[m]) / 2
}

function baldes(posicoes) {
  const saida = Array.from({ length: 10 }, (_, i) => ({ de: i * 10 + 1, ate: (i + 1) * 10, n: 0 }))
  for (const p of posicoes) {
    if (!Number.isFinite(p)) continue
    saida[Math.min(9, Math.floor((p - 1) / 10))].n++
  }
  return saida
}

function contar(linhas, chave) {
  const c = {}
  for (const l of linhas) {
    const v = chave(l)
    if (v != null) c[v] = (c[v] ?? 0) + 1
  }
  return Object.entries(c).sort((a, b) => b[1] - a[1]).map(([nome, n]) => ({ nome, n }))
}

// Media da posicao dentro de cada grupo, com o n do lado. O n e o que impede
// de ler "Acre = 91" como se fosse o Acre, e nao uma pessoa.
function recorte(linhas, campo) {
  const grupos = {}
  for (const l of linhas) {
    const v = l[campo]
    if (v == null || v === '') continue
    ;(grupos[v] ??= []).push(l)
  }
  return Object.entries(grupos)
    .map(([nome, ls]) => ({
      nome, n: ls.length,
      posicao_media: Math.round(media(ls.map(l => l.posicao)) ?? 0),
      economia_media: Math.round(media(ls.map(l => l.economia)) ?? 0),
      costumes_media: Math.round(media(ls.map(l => l.costumes)) ?? 0),
      confiavel: ls.length >= PISO_CONFIAVEL,
    }))
    .sort((a, b) => b.n - a.n)
}

function faixaEtaria(ano) {
  if (!ano) return null
  const idade = new Date().getFullYear() - Number(ano)
  if (idade < 25) return '16-24'
  if (idade < 35) return '25-34'
  if (idade < 45) return '35-44'
  if (idade < 60) return '45-59'
  return '60+'
}

// Tempo de resposta.
//
// A duracao sai do primeiro ao ultimo clique, e nao de started_at: quem abre,
// some por duas horas e volta apareceria com uma sessao de duas horas e
// estragaria a mediana.
//
// Por pergunta, o intervalo ate o clique seguinte. Intervalos acima de cinco
// minutos sao descartados — sao pausa, nao leitura, e a pergunta nao tem culpa.
async function tempos(sb, sessoes) {
  const { data: respostas } = await sb.from('responses')
    .select('session_id, question_id, answered_at').limit(50000)

  const porSessao = {}
  for (const r of respostas ?? []) (porSessao[r.session_id] ??= []).push(r)

  const duracoes = []
  const porPergunta = {}

  for (const [id, lista] of Object.entries(porSessao)) {
    const o = lista.map(r => ({ ...r, t: new Date(r.answered_at).getTime() }))
                   .sort((a, b) => a.t - b.t)
    if (o.length >= 2) duracoes.push(Math.round((o.at(-1).t - o[0].t) / 1000))

    for (let i = 0; i + 1 < o.length; i++) {
      const dt = (o[i + 1].t - o[i].t) / 1000
      if (dt <= 0 || dt > 300) continue
      ;(porPergunta[o[i].question_id] ??= []).push(dt)
    }
    void id
  }

  const concluidas = sessoes.filter(s => s.status === 'completed').length

  return {
    sessoes_medidas: duracoes.length,
    concluidas,
    duracao_mediana_s: duracoes.length ? Math.round(mediana(duracoes)) : null,
    // As dez perguntas em que as pessoas mais param. Parada longa e sinal de
    // enunciado confuso — e a lista de candidatas a reescrita.
    perguntas_mais_lentas: Object.entries(porPergunta)
      .map(([id, ts]) => ({ id, n: ts.length, mediana_s: Number(mediana(ts).toFixed(1)) }))
      .filter(p => p.n >= 3)
      .sort((a, b) => b.mediana_s - a.mediana_s)
      .slice(0, 10),
  }
}
