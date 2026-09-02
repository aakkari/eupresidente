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
import { aplicarTravas, podeUsar, BLOCOS, RECURSOS, PADRAO_RECURSOS, PADRAO_TRAVAS } from '../netlify/functions/_lib/plano.js'

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

// Mesma ordenacao da Function de producao: agrupa por eixo e embaralha por
// dentro, com semente na sessao para a ordem nao mudar ao recarregar.
const ORDEM_EIXOS = ['ECO','SOC','AUT','NAC','DEM','AMB']
function ordenar(perguntas, semente) {
  let h = 0
  for (const c of String(semente)) h = (h * 31 + c.charCodeAt(0)) % 2147483647
  const rnd = () => (h = (h * 1103515245 + 12345) % 2147483647) / 2147483647
  const misturar = xs => { const a = [...xs]
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]] }
    return a }
  const porEixo = {}
  for (const p of perguntas) (porEixo[p.axis] ||= []).push(p)
  return misturar(ORDEM_EIXOS.filter(e => porEixo[e]?.length)).flatMap(e => misturar(porEixo[e]))
}

// --- estado em memoria -----------------------------------------------------

const sessoes = new Map()

// --- estado da demo --------------------------------------------------------
// NIVEL_DEMO troca entre anonimo, cadastrado e assinante sem banco nenhum: e
// como eu vejo as tres travas na mesma maquina.
const nivelDemo = process.env.NIVEL_DEMO || 'anonimo'
const config = {
  assinatura: { ativa: false, gateway: null, preco_centavos: 4990, moeda: 'BRL',
                ciclo: 'anual', titulo: 'Assinatura anual',
                descricao: 'Acesso ao report completo por um ano.' },
  // TRAVAS_JSON permite ver a variante paga sem banco: por exemplo
  // TRAVAS_JSON='{"paises":"assinante"}' com NIVEL_DEMO=cadastrado.
  travas: { ...PADRAO_TRAVAS, ...(process.env.TRAVAS_JSON ? JSON.parse(process.env.TRAVAS_JSON) : {}) },
  recursos: { ...PADRAO_RECURSOS, ...(process.env.RECURSOS_JSON ? JSON.parse(process.env.RECURSOS_JSON) : {}) },
}
const resumir = (a) => a && ({ id: a.id, name: a.name, color: a.color, centroid: a.centroid })

const NOMES_DEMO = ['Marina Prado', 'Ana Prado', 'Beto Lima', 'Carla Duarte', 'Dedé',
                    'Eva Nakamura', 'Fábio Rocha', 'Gil', 'Helena Braga']
const comunidadeDemo = {
  existe: false, nome: 'Família', compartilhando: true, convites: [],
  // Cada pessoa cai no centroide de um arquetipo diferente, com um empurrao
  // pequeno: sem ruido os pontos ficariam exatamente sobre as familias de
  // fundo, e eu nao veria se a anticolisao de rotulos funciona.
  membros() {
    const ruido = (i, k) => ((Math.sin(i * 12.9898 + k * 78.233) * 43758.5453) % 1) * 0.18
    return NOMES_DEMO.map((nome, i) => {
      const a = archetypes[i % archetypes.length]
      const vector = Object.fromEntries(Object.entries(a.centroid)
        .map(([e, v], k) => [e, Math.max(-1, Math.min(1, v + ruido(i + 1, k + 1)))]))
      return { user_id: `u${i}`, nome, sou_eu: i === 0, vector,
               posicao: posicaoPolitica(vector), familia: a.name,
               quando: new Date(Date.now() - i * 864e5).toISOString() }
    })
  },
}

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
    const perguntas = ordenar(questions
      .filter(q => mode === 'short' ? q.in_short : q.in_long)
      .map(({ id, block, ord, body: b, axis, facet }) => ({ id, block, ord, body: b, axis, facet })), token)
    json(res, { token, mode, instrumento, perguntas })
  },

  instrumento: (_body, _q, res) => {
    const curta = questions.filter(q => q.in_short).length
    const longa = questions.filter(q => q.in_long).length
    const minutos = n => Math.max(2, Math.ceil((n * 13) / 60))
    json(res, { id: instrumento.id, label: instrumento.label,
      curta: { perguntas: curta, minutos: minutos(curta) },
      completa: { perguntas: longa, minutos: minutos(longa) },
      familias: archetypes.map(a => ({ id: a.id, name: a.name, color: a.color, centroid: a.centroid })) })
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
    const bruto = archetypes.find(a => a.id === s.resultado.archetype_id) ?? null
    // Mesma trava da producao, lendo a mesma configuracao — se aqui divergisse,
    // o que eu vejo na demo nao seria o que a pessoa ve no ar.
    const { arquetipo, bloqueados, proximoNivel } = aplicarTravas(bruto, config.travas, nivelDemo)
    json(res, {
      posicao: posicaoPolitica(s.resultado.vector),
      resultado: s.resultado,
      instrumento,
      arquetipo,
      arquetipo_secundario: resumir(archetypes.find(a => a.id === s.resultado.archetype_secondary_id)),
      todos_arquetipos: archetypes.map(resumir),
      nivel: nivelDemo,
      meu: nivelDemo !== 'anonimo',
      trava: bloqueados.length
        ? { proximo_nivel: proximoNivel, blocos: bloqueados,
            preco_centavos: config.assinatura.preco_centavos,
            assinatura_ativa: config.assinatura.ativa }
        : null,
    })
  },

  assinatura: (_body, _q, res) => json(res, {
    nivel: nivelDemo,
    assinatura: { status: nivelDemo === 'assinante' ? 'ativa' : 'nenhuma',
                  period_end: nivelDemo === 'assinante'
                    ? new Date(Date.now() + 3155e7).toISOString() : null,
                  cancel_at_period_end: false, gateway: 'manual' },
    pagamentos: [],
    plano: { ...config.assinatura, a_venda: false },
  }),

  'resultado-apagar': (body, _q, res) => {
    sessoes.delete(body?.token)
    json(res, { ok: true })
  },

  'admin-config': (body, _q, res) => {
    if (body?.assinatura) config.assinatura = { ...config.assinatura, ...body.assinatura }
    if (body?.travas) config.travas = { ...config.travas, ...body.travas }
    if (body?.recursos) config.recursos = { ...config.recursos, ...body.recursos }
    json(res, {
      assinatura: config.assinatura, travas: config.travas,
      recursos: config.recursos, recursos_disponiveis: RECURSOS,
      blocos: BLOCOS.map(({ id, rotulo, promessa }) => ({ id, rotulo, promessa })),
      niveis: ['todos', 'cadastrado', 'assinante'],
      gateways: ['manual', 'stripe', 'mercadopago'], gateways_disponiveis: ['manual'],
    })
  },

  'admin-assinantes': (_body, _q, res) => json(res, { assinantes: [] }),

  'admin-resumo': (_body, _q, res) => {
    const membros = comunidadeDemo.membros()
    const j = (n) => ({ rotulo: n.rotulo, contas: n.k * 3, questionarios: n.k * 4,
      iniciados: n.k * 6, perfis: n.k * 2, assinaturas: Math.max(0, n.k - 1),
      receita_centavos: Math.max(0, n.k - 1) * 4990, comunidades: Math.max(0, n.k - 2),
      convites: n.k * 2, convites_aceitos: n.k, mensagens: n.k })
    json(res, {
      janelas: ['7d', '30d', '90d', 'tudo'],
      dados: { '7d': j({ rotulo: '7 dias', k: 2 }), '30d': j({ rotulo: '30 dias', k: 5 }),
               '90d': j({ rotulo: '90 dias', k: 9 }), tudo: j({ rotulo: 'Tudo', k: 12 }) },
      hoje: { contas: 41, contas_confirmadas: 38, assinantes: 6, perfis_preenchidos: 23,
              questionarios: membros.length * 4, conclusao: 0.78, resultados: membros.length * 4,
              comunidades: 3, mensagens_novas: 2, receita_centavos: 6 * 4990 },
    })
  },

  'admin-usuarios': (_body, q, res) => {
    const usuarios = comunidadeDemo.membros().map((m, i) => ({
      id: m.user_id, email: `${m.nome.split(' ')[0].toLowerCase()}@exemplo.com`,
      criada_em: m.quando, ultimo_acesso: m.quando, confirmada: i !== 3,
      nome: m.nome, uf: ['SP','RJ','MG','BA','RS','PE','SP','PR','SC'][i] ?? null,
      cidade: ['São Paulo','Rio','BH','Salvador','Porto Alegre','Recife','Campinas','Curitiba','Joinville'][i] ?? null,
      escolaridade: ['Superior','Médio','Pós-graduação','Superior','Médio','Superior','Pós-graduação','Superior','Médio'][i],
      ocupacao: ['professora','autônomo','médica','aposentado','estudante','advogado','engenheira','vendedor','enfermeira'][i],
      nascimento: 1960 + i * 4,
      questionarios: (i % 3) + 1, posicao: m.posicao?.posicao ?? null,
      rotulo: m.posicao?.rotulo ?? null, familia: m.familia,
      assinante: i < 2, pago_centavos: i < 2 ? 4990 : 0,
      mensagens: i === 1 ? 2 : 0, mensagens_abertas: i === 1 ? 1 : 0,
      comunidades: i < 4 ? 1 : 0,
    }))
    if (!q.get('usuario')) return json(res, { usuarios })
    const p = usuarios.find(x => x.id === q.get('usuario')) ?? usuarios[0]
    const m = comunidadeDemo.membros().find(x => x.user_id === p.id) ?? comunidadeDemo.membros()[0]
    json(res, {
      usuario: { id: p.id, email: p.email, criada_em: p.criada_em, ultimo_acesso: p.ultimo_acesso,
        confirmada: p.confirmada,
        perfil: { full_name: p.nome, display_name: p.nome.split(' ')[0], phone: '(11) 90000-0000',
                  birth_year: p.nascimento, city: p.cidade, uf: p.uf,
                  education: p.escolaridade, occupation: p.ocupacao },
        assinatura: p.assinante
          ? { status: 'ativa', gateway: 'manual', period_end: new Date(Date.now() + 3155e7).toISOString() }
          : null,
        pagamentos: p.assinante
          ? [{ amount_cents: 4990, currency: 'BRL', status: 'pago', method: 'cortesia',
               paid_at: p.criada_em, created_at: p.criada_em }] : [],
        mensagens: p.mensagens
          ? [{ id: 'm1', subject: 'Discordo do meu resultado', status: 'novo',
               message: 'Achei que o eixo de costumes nao refletiu o que eu penso.',
               created_at: p.criada_em }] : [],
        comunidades: p.comunidades
          ? [{ nome: comunidadeDemo.nome, dono: true, aparece_no_mapa: true, desde: p.criada_em }] : [],
      },
      questionarios: [{
        token: 'demo', mode: 'short', status: 'completed',
        iniciado: p.criada_em, terminado: p.criada_em, respondidas: 16, duracao_s: 214,
        posicao: m.posicao, familia: m.familia, vector: m.vector,
        confidence: Object.fromEntries(Object.keys(m.vector).map(e => [e, 0.7])),
        neutral_rate: 0.12, tensions: [], quality_flags: [], research_eligible: true,
      }],
    })
  },

  'admin-populacao': (_body, _q, res) => {
    const membros = comunidadeDemo.membros()
    const escala = Array.from({ length: 10 }, (_, i) => ({ de: i * 10 + 1, ate: (i + 1) * 10, n: 0 }))
    for (const m of membros) escala[Math.min(9, Math.floor((m.posicao.posicao - 1) / 10))].n++
    const contar = (f) => {
      const c = {}
      for (const m of membros) c[f(m)] = (c[f(m)] ?? 0) + 1
      return Object.entries(c).sort((a, b) => b[1] - a[1]).map(([nome, n]) => ({ nome, n }))
    }
    json(res, {
      total: membros.length, escala,
      por_rotulo: contar(m => m.posicao.rotulo), por_familia: contar(m => m.familia),
      por_versao: [{ nome: 'rápida', n: membros.length }],
      media_eixos: { ECO: -0.12, SOC: 0.08, AUT: -0.04, NAC: 0.11, DEM: -0.2, AMB: 0.3 },
      recortes: {
        uf: [{ nome: 'SP', n: 34, posicao_media: 52, economia_media: 55, costumes_media: 48, confiavel: true },
             { nome: 'RJ', n: 12, posicao_media: 61, economia_media: 64, costumes_media: 57, confiavel: false }],
        escolaridade: [{ nome: 'Superior', n: 31, posicao_media: 48, economia_media: 50, costumes_media: 45, confiavel: true }],
        ocupacao: [{ nome: 'professora', n: 8, posicao_media: 29, economia_media: 25, costumes_media: 33, confiavel: false }],
        faixa_etaria: [{ nome: '35-44', n: 30, posicao_media: 50, economia_media: 52, costumes_media: 47, confiavel: true },
                       { nome: '60+', n: 9, posicao_media: 68, economia_media: 66, costumes_media: 71, confiavel: false }],
      },
      sem_perfil: 12, piso_confiavel: 30,
      tempo: { sessoes_medidas: 41, concluidas: 39, duracao_mediana_s: 247,
        perguntas_mais_lentas: questions.slice(0, 6).map((q, i) => ({
          id: q.id, n: 20 - i * 2, mediana_s: Number((18 - i * 2.3).toFixed(1)) })) },
    })
  },

  'admin-comunidades': (_body, _q, res) => {
    const pessoas = comunidadeDemo.membros().map(m => ({
      nome: m.nome, no_mapa: true, posicao: m.posicao.posicao, desde: m.quando }))
    const pos = pessoas.map(p => p.posicao)
    const media = pos.reduce((s, v) => s + v, 0) / pos.length
    json(res, {
      comunidades: [{
        id: 'demo', nome: comunidadeDemo.nome, criada_em: new Date().toISOString(),
        dono: pessoas[0].nome, membros: pessoas.length, no_mapa: pessoas.length,
        convites_pendentes: comunidadeDemo.convites.length, convites_aceitos: 4, convites_recusados: 1,
        com_resultado: pessoas.length, posicao_media: Math.round(media),
        dispersao: Number(Math.sqrt(pos.reduce((s, v) => s + (v - media) ** 2, 0) / pos.length).toFixed(1)),
        pessoas,
      }],
      totais: { comunidades: 1, pessoas: pessoas.length, media_por_comunidade: pessoas.length,
                convites: 5 + comunidadeDemo.convites.length, taxa_aceite: 0.8 },
    })
  },

  'admin-perfis': (body, _q, res) => {
    if (body?.id) return json(res, { ok: true })
    const EIXOS = ['ECO', 'SOC', 'AUT', 'NAC', 'DEM', 'AMB']
    const dist = (a, b) => Math.sqrt(EIXOS.reduce((s, e) =>
      s + ((a.centroid?.[e] ?? 0) - (b.centroid?.[e] ?? 0)) ** 2, 0))
    const separa = (a, b) => EIXOS.map(e => ({ eixo: e,
      delta: Number(Math.abs((a.centroid?.[e] ?? 0) - (b.centroid?.[e] ?? 0)).toFixed(2)) }))
      .sort((x, y) => y.delta - x.delta)[0]
    const pares = []
    for (let i = 0; i < archetypes.length; i++)
      for (let j = i + 1; j < archetypes.length; j++)
        pares.push({ a: archetypes[i].name, b: archetypes[j].name,
          d: Number(dist(archetypes[i], archetypes[j]).toFixed(3)),
          separa: separa(archetypes[i], archetypes[j]) })
    json(res, {
      instrumentos: [instrumento], instrumento_id: instrumento.id, eixos: instrumento.axes,
      pares_proximos: pares.sort((a, b) => a.d - b.d).slice(0, 8),
      perfis: archetypes.map((a, i) => {
        const define = EIXOS.map(e => ({ eixo: e, valor: Number(a.centroid?.[e] ?? 0) }))
          .sort((x, y) => Math.abs(y.valor) - Math.abs(x.valor))
        return { ...a, pessoas: (i * 3) % 7, como_segundo: (i * 2) % 5,
          tecnico: {
            define: define.filter(d => Math.abs(d.valor) >= 0.5),
            indiferente: define.filter(d => Math.abs(d.valor) < 0.2).map(d => d.eixo),
            vizinhos: archetypes.filter(o => o.id !== a.id)
              .map(o => ({ id: o.id, nome: o.name, d: Number(dist(a, o).toFixed(3)), separa: separa(a, o) }))
              .sort((x, y) => x.d - y.d).slice(0, 3),
          },
          falta: ['name','tagline','description','history','blind_spots','schools','curiosities',
                  'figures','strengths','weaknesses','countries']
            .filter(c => a[c] == null || a[c] === '' || (Array.isArray(a[c]) && !a[c].length)) }
      }),
    })
  },

  'admin-contato': (body, _q, res) => {
    if (body?.status) return json(res, { ok: true })
    json(res, { novas: 2, mensagens: [
      { id: 'm1', name: 'Ana Prado', email: 'ana@exemplo.com', subject: 'Discordo do meu resultado',
        message: 'Achei que o eixo de costumes não refletiu o que eu penso. Respondi que sou a favor\nda união estável e mesmo assim deu conservador.',
        user_id: 'u1', status: 'novo', created_at: new Date().toISOString() },
      { id: 'm2', name: 'Jornal X', email: 'redacao@exemplo.com', subject: 'Pauta',
        message: 'Gostaríamos de falar sobre a metodologia para uma matéria.',
        user_id: null, status: 'novo', created_at: new Date(Date.now() - 864e5).toISOString() },
    ] })
  },

  contato: (_body, _q, res) => json(res, { ok: true }),

  // Comunidade em memoria. Serve para ver o mapa cheio sem precisar de cinco
  // contas reais — as pessoas de demonstracao vem de arquetipos diferentes,
  // que e o caso que importa olhar.
  comunidade: (body, q, res) => {
    if (q.get('convite')) return json(res, { convite: {
      comunidade: comunidadeDemo.nome, convidado_por: 'Ana', email: 'voce@exemplo.com' } })

    if (body?.acao === 'criar') { comunidadeDemo.nome = body.nome; comunidadeDemo.existe = true; return json(res, { ok: true, id: 'demo' }) }
    if (body?.acao === 'convidar') { comunidadeDemo.convites.push({ id: String(Date.now()), email: body.email, created_at: new Date().toISOString() }); return json(res, { ok: true, link: 'http://localhost:4173/comunidade?convite=demo', enviado: false }) }
    if (body?.acao === 'cancelar_convite') { comunidadeDemo.convites = comunidadeDemo.convites.filter(c => c.id !== body.id); return json(res, { ok: true }) }
    if (body?.acao === 'compartilhar') { comunidadeDemo.compartilhando = Boolean(body.compartilhando); return json(res, { ok: true }) }
    if (body?.acao === 'sair') { comunidadeDemo.existe = false; return json(res, { ok: true }) }
    if (body?.acao === 'aceitar') { comunidadeDemo.existe = true; return json(res, { ok: true, id: 'demo' }) }
    if (body?.acao === 'recusar') return json(res, { ok: true })

    const podeCriar = podeUsar('criar_comunidade', config.recursos, nivelDemo)
    if (!comunidadeDemo.existe || !podeCriar) return json(res, {
      comunidades: comunidadeDemo.existe && podeCriar ? [] : [],
      convites_recebidos: [], email_ativo: false, nivel: nivelDemo, pode_criar: podeCriar,
      plano: podeCriar ? null : { ...config.assinatura, a_venda: false },
    })

    return json(res, {
      comunidades: [{
        id: 'demo', nome: comunidadeDemo.nome, criada_em: new Date().toISOString(),
        sou_dono: true, compartilhando: comunidadeDemo.compartilhando,
        membros: comunidadeDemo.membros(), total_membros: comunidadeDemo.membros().length,
        convites: comunidadeDemo.convites,
      }],
      convites_recebidos: [], email_ativo: false, nivel: nivelDemo, pode_criar: podeCriar,
      plano: podeCriar ? null : { ...config.assinatura, a_venda: false },
    })
  },

  // No modo demo o admin nao autentica: nao existe Supabase Auth aqui. Em
  // producao cada Function confere o token contra ADMIN_EMAILS.
  perfil: (_body, _q, res) => json(res, {
    email: 'voce@exemplo.com', full_name: 'Andre Akkari', display_name: 'Andre', phone: '',
    birth_year: null, city: '', uf: '', education: '', occupation: '',
    desde: new Date().toISOString(), questionarios: sessoes.size,
  }),

  'meus-resultados': (_body, _q, res) => {
    const out = []
    for (const [token, s] of sessoes) if (s.resultado) out.push({
      token, mode: s.mode, quando: new Date().toISOString(),
      familia: archetypes.find(a => a.id === s.resultado.archetype_id)?.name ?? '—',
      cor: archetypes.find(a => a.id === s.resultado.archetype_id)?.color ?? '#0a0a0b',
      tagline: archetypes.find(a => a.id === s.resultado.archetype_id)?.tagline ?? null,
      vector: s.resultado.vector,
      posicao: posicaoPolitica(s.resultado.vector),
    })
    json(res, { resultados: out })
  },

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
