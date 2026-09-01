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
    vector, confidence, consistency,
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

// Posicao esquerda-direita, em DOIS numeros e nao em um.
//
// A primeira versao disto somava economia e costumes num valor so, e o teste
// derrubou na hora: o libertario (direita na economia, progressista nos
// costumes) e o nacional-popular (o inverso exato) davam ambos "Centro" com
// 3% e 11%. Dois cantos opostos do mapa recebendo o mesmo rotulo errado.
// Nenhum ajuste de peso conserta isso — e limitacao de projetar duas coisas
// independentes num eixo so.
//
// Entao: dois eixos, e rotulo unico apenas quando os dois concordam. Quem
// cruza recebe a descricao cruzada, que e mais informativa e e verdade.
const FAIXAS = [
  { ate: -0.75, e: 'Esquerda radical',  c: 'Progressista radical' },
  { ate: -0.45, e: 'Esquerda',          c: 'Progressista' },
  { ate: -0.15, e: 'Centro-esquerda',   c: 'Centro-progressista' },
  { ate:  0.15, e: 'Centro',            c: 'Centro' },
  { ate:  0.45, e: 'Centro-direita',    c: 'Centro-conservador' },
  { ate:  0.75, e: 'Direita',           c: 'Conservador' },
  { ate:  1.01, e: 'Direita radical',   c: 'Conservador radical' },
]

const faixa = (v, chave) => FAIXAS.find(f => v < f.ate)?.[chave] ?? 'Centro'

export function posicaoPolitica(vetor) {
  // Economia: mercado empurra para a direita.
  const economia = round(Math.max(-1, Math.min(1, vetor.ECO ?? 0)), 3)

  // Costumes: tradicao e ordem empurram para o conservador. AUT entra com
  // peso menor porque autoridade nao e a mesma coisa que conservadorismo —
  // existe autoritario progressista e liberal conservador.
  const costumes = round(Math.max(-1, Math.min(1,
    -0.72 * (vetor.SOC ?? 0) + 0.28 * (vetor.AUT ?? 0))), 3)

  const rotEco = faixa(economia, 'e')
  const rotCos = faixa(costumes, 'c')

  // Concordam quando apontam para o mesmo lado, ou quando um deles e centro.
  const ladoDe = v => v < -0.18 ? -1 : v > 0.18 ? 1 : 0
  const le = ladoDe(economia), lc = ladoDe(costumes)
  const coerente = le === lc || le === 0 || lc === 0

  // Media so entre eixos que apontam para o mesmo lado. Se um esta no centro,
  // o rotulo segue o outro: quem tem economia -0.8 e de esquerda no bolso,
  // mesmo sem opiniao formada sobre costumes. Fazer media com o centro dilui
  // o extremo ate o rotulo mentir — foi o que deu "Centro-direita" para o
  // nacional-conservador, que e conservador em 0.77.
  const combinado = !coerente ? null
    : le === 0 && lc === 0 ? round((economia + costumes) / 2, 3)
    : le === 0 ? costumes
    : lc === 0 ? economia
    : round((economia + costumes) / 2, 3)

  // Radical e extremista nao sao a mesma coisa, e aqui elas ficam separadas
  // de proposito. Radical e quanto voce quer mudar — da para ser radical e
  // absolutamente democratico. O metodo e outra pergunta: o eixo DEM diz se a
  // pessoa aceita as regras do jogo quando elas contrariam a maioria. O debate
  // publico brasileiro funde os dois termos; o instrumento nao precisa fundir.
  const metodo = (() => {
    const dem = vetor.DEM ?? 0
    if (dem >= 0.55) return { chave: 'acima_das_regras', rotulo: 'Vontade popular acima das instituicoes',
      texto: 'Quando a maioria e a regra se contradizem, voce fica com a maioria.' }
    if (dem <= -0.55) return { chave: 'regras_acima', rotulo: 'Instituicoes acima da maioria',
      texto: 'Voce aceita que a regra contrarie a maioria — e o ponto dela, para voce.' }
    return { chave: 'equilibrado', rotulo: 'Sem posicao firme sobre o conflito',
      texto: 'Voce nao tem posicao fechada sobre quem decide quando maioria e regra se chocam.' }
  })()

  return {
    economia, costumes, metodo,
    rotulo_economia: rotEco,
    rotulo_costumes: rotCos,
    coerente,
    // Titulo curto: uma frase quando cabe, duas quando nao cabe.
    titulo: coerente
      ? faixa(combinado, 'e')
      : `${rotEco} na economia, ${rotCos.replace('Centro-', '')} nos costumes`,
    intensidade: combinado === null ? null : Math.round(Math.abs(combinado) * 100),
    intensidade_economia: Math.round(Math.abs(economia) * 100),
    intensidade_costumes: Math.round(Math.abs(costumes) * 100),
    // Radical no conteudo, sempre coerente com o titulo mostrado: para quem
    // e coerente vale o valor combinado, para quem cruza vale o eixo mais
    // extremo — que e o que o titulo ja destaca. Nao diz nada sobre metodo.
    radical: combinado !== null
      ? Math.abs(combinado) >= 0.75
      : Math.max(Math.abs(economia), Math.abs(costumes)) >= 0.75,
  }
}
