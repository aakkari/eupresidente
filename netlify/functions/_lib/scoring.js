// Motor de pontuacao. Deterministico por contrato: mesmas respostas produzem
// sempre o mesmo vetor e o mesmo arquetipo. O LLM nunca entra aqui.
// Ver decisao 2 no CLAUDE.md.

const EIXOS = ['ECO', 'SOC', 'AUT', 'NAC', 'DEM', 'AMB']
const VALOR_MAX = 2 // escala Likert vai de -2 a +2

// Vetor de posicao: soma das contribuicoes dividida pela contribuicao maxima
// possivel entre as perguntas efetivamente respondidas. Dividir pelo que foi
// respondido — e nao pelo total do instrumento — mantem a escala em -1..1
// quando a pessoa pula perguntas ou faz a versao curta.
export function computeVector(questions, answers) {
  const soma = {}, teto = {}
  for (const eixo of EIXOS) { soma[eixo] = 0; teto[eixo] = 0 }

  for (const q of questions) {
    if (!q.scored) continue
    const valor = answers[q.id]
    if (valor === undefined || valor === null) continue

    soma[q.axis] += valor * q.direction * Number(q.weight)
    teto[q.axis] += VALOR_MAX * Number(q.weight)

    if (q.secondary_axis && q.secondary_weight !== null) {
      const p = Number(q.secondary_weight)
      // Peso secundario negativo inverte o sentido no segundo eixo — e por isso
      // que o teto usa o valor absoluto. Ver docs/instrumento-v1.md.
      soma[q.secondary_axis] += valor * q.direction * p
      teto[q.secondary_axis] += VALOR_MAX * Math.abs(p)
    }
  }

  const vetor = {}
  for (const eixo of EIXOS) {
    vetor[eixo] = teto[eixo] > 0 ? round(soma[eixo] / teto[eixo], 4) : 0
  }
  return vetor
}

// Quanto o vetor daquele eixo merece credito. Cai quando a pessoa respondeu
// poucas perguntas do eixo, e cai de novo quando respondeu muitas com 0 —
// que no instrumento significa "nao tenho posicao formada", nao "meio-termo".
export function computeConfidence(questions, answers) {
  const respondido = {}, disponivel = {}, neutras = {}, contadas = {}
  for (const eixo of EIXOS) {
    respondido[eixo] = 0; disponivel[eixo] = 0; neutras[eixo] = 0; contadas[eixo] = 0
  }

  for (const q of questions) {
    if (!q.scored) continue
    const p = Number(q.weight)
    disponivel[q.axis] += p
    const valor = answers[q.id]
    if (valor === undefined || valor === null) continue
    respondido[q.axis] += p
    contadas[q.axis] += 1
    if (valor === 0) neutras[q.axis] += 1
  }

  const conf = {}
  for (const eixo of EIXOS) {
    if (disponivel[eixo] === 0 || contadas[eixo] === 0) { conf[eixo] = 0; continue }
    const cobertura = respondido[eixo] / disponivel[eixo]
    const fatiaNeutra = neutras[eixo] / contadas[eixo]
    conf[eixo] = round(cobertura * (1 - 0.6 * fatiaNeutra), 3)
  }
  return conf
}

// Coerencia interna do eixo: compara o que a pessoa respondeu nas perguntas
// escritas na direcao do eixo com o que respondeu nas escritas ao contrario.
// Quem concorda com as duas versoes da mesma ideia nao esta posicionado —
// esta concordando com tudo. 1 = coerente, 0 = contraditorio.
export function computeConsistency(questions, answers) {
  const diretas = {}, invertidas = {}
  for (const eixo of EIXOS) { diretas[eixo] = []; invertidas[eixo] = [] }

  for (const q of questions) {
    if (!q.scored) continue
    const valor = answers[q.id]
    if (valor === undefined || valor === null) continue
    // orientado = onde a resposta cai no eixo, ja corrigida a inversao
    const orientado = valor * q.direction
    ;(q.direction === 1 ? diretas : invertidas)[q.axis].push(orientado)
  }

  const cons = {}
  for (const eixo of EIXOS) {
    const a = diretas[eixo], b = invertidas[eixo]
    if (a.length === 0 || b.length === 0) { cons[eixo] = null; continue }
    const diff = Math.abs(media(a) - media(b))
    cons[eixo] = round(Math.max(0, 1 - diff / (2 * VALOR_MAX)), 3)
  }
  return cons
}

export function computeNeutralRate(questions, answers) {
  const valores = questions
    .filter(q => q.scored)
    .map(q => answers[q.id])
    .filter(v => v !== undefined && v !== null)
  if (valores.length === 0) return 0
  return round(valores.filter(v => v === 0).length / valores.length, 3)
}

// Arquetipo = centroide mais proximo, por distancia euclidiana ponderada pelos
// pesos de eixo do instrumento. Eixo com confianca baixa pesa menos: nao faz
// sentido classificar alguem por um eixo que mal foi medido.
export function nearestArchetypes(vetor, archetypes, axisWeights, confidence, modo) {
  const candidatos = archetypes
    .filter(a => modo === 'long' || a.available_short)
    .map(a => {
      let soma = 0, pesoTotal = 0
      for (const eixo of EIXOS) {
        const w = Number(axisWeights?.[eixo] ?? 1) * (confidence?.[eixo] ?? 1)
        const d = (vetor[eixo] ?? 0) - Number(a.centroid?.[eixo] ?? 0)
        soma += w * d * d
        pesoTotal += w
      }
      return { id: a.id, distancia: pesoTotal > 0 ? Math.sqrt(soma / pesoTotal) : Infinity }
    })
    .sort((x, y) => x.distancia - y.distancia)

  if (candidatos.length === 0) return { primario: null, secundario: null, distancia: null }
  return {
    primario: candidatos[0].id,
    // So oferece um segundo arquetipo quando ele esta perto o bastante para
    // ser uma leitura honesta, e nao apenas o proximo da fila.
    secundario: candidatos[1] && candidatos[1].distancia - candidatos[0].distancia < 0.15
      ? candidatos[1].id : null,
    distancia: round(candidatos[0].distancia, 4),
  }
}

// Eixos em que a pessoa se afasta do proprio arquetipo. E o material mais
// interessante do relatorio: e onde ela nao cabe na caixa.
export function computeTensions(vetor, archetype, confidence, limite = 0.45) {
  if (!archetype) return []
  return EIXOS.filter(eixo => {
    if ((confidence?.[eixo] ?? 0) < 0.5) return false
    const d = Math.abs((vetor[eixo] ?? 0) - Number(archetype.centroid?.[eixo] ?? 0))
    return d >= limite
  })
}

// Vetor por faceta. Mesma formula do eixo, so que agrupando por subdivisao:
// em vez de "Economia -0.83", devolve redistribuicao, regulacao e propriedade
// separadas. E o que da ao relatorio o que dizer alem de repetir o rotulo.
//
// So conta faceta com pelo menos 3 respostas: com uma ou duas, o numero e
// ruido com aparencia de medida.
export function computeFacetVector(questions, answers, minimo = 3) {
  const soma = {}, teto = {}, n = {}
  for (const q of questions) {
    if (!q.scored || !q.facet) continue
    const valor = answers[q.id]
    if (valor === undefined || valor === null) continue
    soma[q.facet] = (soma[q.facet] ?? 0) + valor * q.direction * Number(q.weight)
    teto[q.facet] = (teto[q.facet] ?? 0) + VALOR_MAX * Number(q.weight)
    n[q.facet] = (n[q.facet] ?? 0) + 1
  }
  const vetor = {}
  for (const facet of Object.keys(soma)) {
    if (n[facet] < minimo || teto[facet] === 0) continue
    vetor[facet] = round(soma[facet] / teto[facet], 3)
  }
  return vetor
}

export function scoreSession({ questions, answers, archetypes, axisWeights, mode }) {
  const vector = computeVector(questions, answers)
  const confidence = computeConfidence(questions, answers)
  const consistency = computeConsistency(questions, answers)
  const neutralRate = computeNeutralRate(questions, answers)
  const { primario, secundario, distancia } =
    nearestArchetypes(vector, archetypes, axisWeights, confidence, mode)
  const arquetipo = archetypes.find(a => a.id === primario) || null
  const tensions = computeTensions(vector, arquetipo, confidence)

  return {
    vector,
    facet_vector: computeFacetVector(questions, answers),
    confidence, consistency,
    neutral_rate: neutralRate,
    archetype_id: primario,
    archetype_secondary_id: secundario,
    archetype_distance: distancia,
    tensions,
  }
}

export { EIXOS }

const media = xs => xs.reduce((s, x) => s + x, 0) / xs.length
const round = (n, casas) => Number(n.toFixed(casas))

// Posicao politica numa escala de 1 a 100: 1 = extrema esquerda,
// 100 = extrema direita, 50 = centro.
//
// O sistema sempre se posiciona. Um numero unico e o que a pessoa posta, o
// que permite ordenar amigos e comparar com a populacao — e nada disso
// funciona com uma descricao em duas partes.
//
// O preco: projetar economia e costumes, que sao independentes, num eixo so
// faz extremos opostos se cancelarem. O libertario (direita na economia,
// progressista nos costumes) e o tecnocrata (moderado nos dois) chegam ambos
// perto de 50 por motivos opostos. Por isso vem junto a dispersao: ela diz se
// o 50 e um centro de verdade ou um cruzamento. O numero nunca some; o que a
// dispersao faz e impedir que ele minta.

const FAIXAS = [
  { ate: 13,  rotulo: 'Extrema esquerda' },
  { ate: 28,  rotulo: 'Esquerda' },
  { ate: 43,  rotulo: 'Centro-esquerda' },
  { ate: 58,  rotulo: 'Centro' },
  { ate: 73,  rotulo: 'Centro-direita' },
  { ate: 88,  rotulo: 'Direita' },
  { ate: 101, rotulo: 'Extrema direita' },
]

// -1..+1 vira 1..100.
const paraEscala = v => Math.min(100, Math.max(1, Math.round(50.5 + v * 49.5)))

// Economia pesa mais que costumes na escala esquerda-direita. Nao e opiniao:
// com peso igual o libertario saia em 56, "Centro", sendo 98 na economia — os
// extremos opostos se cancelavam. Testei 50/50, 65/35 e 75/25; em 75/25 o
// socialista democratico virava "extrema esquerda", o que e falso. 65/35 e o
// ponto onde o cruzado para de virar centro sem quebrar o resto.
const PESO_ECONOMIA = 0.65
const PESO_COSTUMES = 0.35

export function posicaoPolitica(vetor) {
  const economia = round(Math.max(-1, Math.min(1, vetor.ECO ?? 0)), 3)

  // AUT entra com peso menor que SOC: autoridade nao e conservadorismo —
  // existe autoritario progressista e existe liberal conservador.
  const costumes = round(Math.max(-1, Math.min(1,
    -0.72 * (vetor.SOC ?? 0) + 0.28 * (vetor.AUT ?? 0))), 3)

  const combinado = round(PESO_ECONOMIA * economia + PESO_COSTUMES * costumes, 3)
  const posicao = paraEscala(combinado)
  const rotulo = FAIXAS.find(f => posicao < f.ate)?.rotulo ?? 'Centro'

  // Quanto os dois eixos discordam entre si, de 0 a 100. Alta significa que a
  // pessoa e de um lado no bolso e de outro no costume, e que o numero unico
  // esconde mais do que mostra.
  const dispersao = Math.round(Math.abs(economia - costumes) / 2 * 100)

  // Metodo e outra pergunta, e nao entra na escala. Radical e quanto voce quer
  // mudar; da para ser radical e completamente democratico. Extremista e quem
  // aceita passar por cima da regra. O debate publico funde os dois termos, o
  // instrumento nao precisa fundir.
  const dem = vetor.DEM ?? 0
  const metodo =
    dem >= 0.55  ? { chave: 'acima_das_regras', rotulo: 'Vontade popular acima das instituições',
                     texto: 'Quando a maioria e a regra se contradizem, você fica com a maioria.' }
  : dem <= -0.55 ? { chave: 'regras_acima', rotulo: 'Instituições acima da maioria',
                     texto: 'Você aceita que a regra contrarie a maioria — para você, é o ponto dela.' }
                 : { chave: 'equilibrado', rotulo: 'Sem posição firme sobre o conflito',
                     texto: 'Você não fechou posição sobre quem decide quando maioria e regra se chocam.' }

  return {
    posicao,                       // 1 a 100 — o numero que a pessoa leva
    rotulo,                        // Extrema esquerda ... Extrema direita
    economia_1_100: paraEscala(economia),
    costumes_1_100: paraEscala(costumes),
    dispersao,
    cruzado: dispersao >= 35,      // o numero unico esconde algo relevante
    metodo,
  }
}
