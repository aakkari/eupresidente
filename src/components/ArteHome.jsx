// Arte da home: uma amostra do que a pessoa recebe no fim, em chave grafica.
// Sem legenda, sem numero real — a intencao e provocar curiosidade, nao
// explicar. Tudo em preto e branco, porque um instrumento politico com cor de
// marca sinaliza lado antes da primeira pergunta.

export function MapaArte({ className = '', preencher = false, comEixos = false }) {
  // Posicoes soltas, sem correspondencia com familia nenhuma: e ilustracao,
  // e passar por dado seria mentir na vitrine.
  const pontos = [
    [18, 24], [31, 41], [44, 18], [58, 33], [72, 22], [83, 47],
    [26, 63], [39, 78], [52, 58], [67, 71], [79, 84], [14, 86],
    [61, 12], [88, 63], [47, 92],
  ]
  return (
    // preencher: corta as bordas para ocupar a caixa inteira, em vez de
    // encolher o mapa ate ele virar um detalhe ilegivel.
    <svg viewBox="0 0 100 100" className={className} aria-hidden="true"
         preserveAspectRatio={preencher ? 'xMidYMid slice' : 'xMidYMid meet'}>
      <defs>
        <radialGradient id="halo">
          <stop offset="0%" stopColor="#0a0a0b" stopOpacity="0.10" />
          <stop offset="100%" stopColor="#0a0a0b" stopOpacity="0" />
        </radialGradient>
      </defs>
      <line x1="50" y1="2" x2="50" y2="98" stroke="#e4e4e4" strokeWidth="0.5" />
      <line x1="2" y1="50" x2="98" y2="50" stroke="#e4e4e4" strokeWidth="0.5" />
      {[25, 75].map(v => (
        <g key={v}>
          <line x1={v} y1="2" x2={v} y2="98" stroke="#efefef" strokeWidth="0.4" />
          <line x1="2" y1={v} x2="98" y2={v} stroke="#efefef" strokeWidth="0.4" />
        </g>
      ))}
      {pontos.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="1.6" fill="none" stroke="#a3a3a8" strokeWidth="0.7" />
      ))}
      <circle cx="34" cy="66" r="14" fill="url(#halo)" />
      <circle cx="34" cy="66" r="3.4" fill="#0a0a0b" />
      <circle cx="34" cy="66" r="6.5" fill="none" stroke="#0a0a0b" strokeWidth="0.6" opacity="0.35" />

      {/* Nomes dos eixos: sem eles o mapa e um padrao bonito e mudo. Com
          eles, a pessoa entende em dois segundos o que vai receber. */}
      {comEixos && (
        <g fontSize="3.1" fill="#6b6b70" fontFamily="Inter, system-ui, sans-serif">
          <text x="50" y="6"  textAnchor="middle">ordem</text>
          <text x="50" y="88" textAnchor="middle">liberdade</text>
          <text x="3"  y="51" textAnchor="start">Estado</text>
          <text x="97" y="51" textAnchor="end">mercado</text>
          <text x="34" y="59" textAnchor="middle" fill="#0a0a0b" fontSize="3.4" fontWeight="600">você</text>
        </g>
      )}
    </svg>
  )
}

export function ReguaArte({ className = '', valor = 22 }) {
  return (
    <svg viewBox="0 0 100 14" className={className} aria-hidden="true">
      {[...Array(41)].map((_, i) => (
        <line key={i} x1={i * 2.5} y1={i % 5 === 0 ? 2 : 4} x2={i * 2.5} y2="8"
              stroke={i % 5 === 0 ? '#a3a3a8' : '#e4e4e4'} strokeWidth="0.5" />
      ))}
      <circle cx={valor} cy="5" r="3.2" fill="#0a0a0b" />
      <circle cx={valor} cy="5" r="5.4" fill="none" stroke="#0a0a0b" strokeWidth="0.5" opacity="0.3" />
    </svg>
  )
}

export function EixosArte({ className = '' }) {
  const linhas = [62, -38, 45, -71, 28, -54]
  return (
    <svg viewBox="0 0 100 46" className={className} aria-hidden="true">
      {linhas.map((v, i) => {
        const y = 4 + i * 7.6
        const meio = 50
        const largura = Math.abs(v) / 2.4
        return (
          <g key={i}>
            <line x1="4" y1={y} x2="96" y2={y} stroke="#efefef" strokeWidth="2.2" strokeLinecap="round" />
            <line x1={v > 0 ? meio : meio - largura} y1={y} x2={v > 0 ? meio + largura : meio} y2={y}
                  stroke="#0a0a0b" strokeWidth="2.2" strokeLinecap="round" />
          </g>
        )
      })}
      <line x1="50" y1="1" x2="50" y2="45" stroke="#a3a3a8" strokeWidth="0.4" />
    </svg>
  )
}

// Composicao usada no alto da home.
export default function ArteHome() {
  return (
    <div className="relative">
      <MapaArte className="w-full" />
      <div className="pointer-events-none absolute inset-x-[8%] bottom-[-6%] rounded-xl border border-borda bg-white/95 p-4 shadow-[0_1px_20px_rgba(0,0,0,0.04)] backdrop-blur">
        <ReguaArte className="w-full" />
      </div>
    </div>
  )
}

// O mapa da comunidade na home.
//
// A primeira versao era sete bolinhas num grid: bonito e mudo. Um mapa da
// comunidade so vale a pena se mostrar a DINAMICA do grupo, e nao a existencia
// dele. Tres coisas fazem isso aqui:
//
// 1. Os quadrantes tem nome. Sem isso um ponto no canto superior direito nao
//    quer dizer nada, e o mapa e decoracao.
// 2. O territorio: o poligono que envolve o grupo. E o que se ve primeiro —
//    "a minha familia ocupa este pedaco" — e e a informacao mais politica que
//    existe aqui.
// 3. A regua embaixo, com as mesmas pessoas na escala de 1 a 100. E ela que
//    transforma "estamos espalhados" em "vamos de 8 a 83".
const TURMA = [
  { nome: 'Marina', x: 26, y: 70, n: 12, eu: true },
  { nome: 'Ana',    x: 19, y: 34, n: 21 },
  { nome: 'Beto',   x: 45, y: 55, n: 46 },
  { nome: 'Dedé',   x: 60, y: 44, n: 58 },
  { nome: 'Gil',    x: 55, y: 20, n: 63 },
  { nome: 'Eva',    x: 74, y: 66, n: 71 },
  { nome: 'Carla',  x: 82, y: 30, n: 86 },
]

const QUADRANTES = [
  { t: 'esquerda autoritária', x: 6,  y: 11, anc: 'start' },
  { t: 'direita autoritária',  x: 94, y: 11, anc: 'end' },
  { t: 'esquerda libertária',  x: 6,  y: 86, anc: 'start' },
  { t: 'direita libertária',   x: 94, y: 86, anc: 'end' },
]

export function MapaExemplo({ className = '' }) {
  const casco = envolver(TURMA)
  const ns = TURMA.map(p => p.n)
  const menor = Math.min(...ns), maior = Math.max(...ns)

  return (
    <div className={className}>
      <svg viewBox="0 0 100 96" className="w-full" role="img"
           aria-label="Exemplo de comunidade: sete pessoas espalhadas pelo mapa político">
        {/* Grade discreta: estrutura sem competir com o territorio. */}
        {[25, 50, 75].map(v => (
          <g key={v}>
            <line x1={v} y1="4" x2={v} y2="92" stroke="#e9e9e9" strokeWidth={v === 50 ? 0.5 : 0.3} />
            <line x1="4" y1={v * 0.88 + 4} x2="96" y2={v * 0.88 + 4}
                  stroke="#e9e9e9" strokeWidth={v === 50 ? 0.5 : 0.3} />
          </g>
        ))}

        {QUADRANTES.map(q => (
          <text key={q.t} x={q.x} y={q.y} fontSize="3" fill="#a3a3a8"
                textAnchor={q.anc} letterSpacing="0.3">{q.t}</text>
        ))}

        {/* O territorio do grupo. E a primeira coisa que o olho pega, e a
            unica que responde "como a minha gente pensa" de uma vez. */}
        <polygon points={casco.map(p => `${p.x},${p.y}`).join(' ')}
                 fill="#0a0a0b" fillOpacity="0.055"
                 stroke="#0a0a0b" strokeOpacity="0.2" strokeWidth="0.45"
                 strokeLinejoin="round" />

        {TURMA.map(p => (
          <g key={p.nome}>
            {p.eu && (
              <circle cx={p.x} cy={p.y} r="5" fill="none"
                      stroke="#0a0a0b" strokeWidth="0.5" opacity="0.3" />
            )}
            <circle cx={p.x} cy={p.y} r="2.4" fill={p.eu ? '#0a0a0b' : '#fff'}
                    stroke="#0a0a0b" strokeWidth="1" />
            <text x={p.x + (p.x > 60 ? -4 : 4)} y={p.y + 1.3}
                  textAnchor={p.x > 60 ? 'end' : 'start'}
                  fontSize="4.2" fontWeight={p.eu ? 700 : 500} fill="#0a0a0b"
                  stroke="#fff" strokeWidth="1.1" paintOrder="stroke">
              {p.nome}
            </text>
          </g>
        ))}

        <text x="4" y="94" fontSize="3.2" fill="#5b5f6b">Estado coordena</text>
        <text x="96" y="94" fontSize="3.2" fill="#5b5f6b" textAnchor="end">mercado coordena</text>
      </svg>

      {/* A regua transforma "estamos espalhados" em um numero. */}
      <div className="mt-4 border-t border-borda pt-4">
        <div className="relative h-8">
          <div className="absolute inset-x-0 top-3 h-1 rounded-full bg-borda/60" />
          {/* A faixa e o argumento: mostra de uma vez o quanto a turma se
              espalha. Em cinza fraco ela sumia e a regua virava so tracinhos. */}
          <div className="absolute top-3 h-1 rounded-full bg-tinta/45"
               style={{ left: `${menor}%`, width: `${maior - menor}%` }} />
          {TURMA.map(p => (
            <div key={p.nome}
                 className={`absolute top-1.5 h-4 w-[3px] -translate-x-1/2 rounded-full ${
                   p.eu ? 'bg-tinta' : 'bg-tinta/45'}`}
                 style={{ left: `${p.n}%` }} title={`${p.nome}: ${p.n}`} />
          ))}
        </div>
        <div className="flex justify-between text-[11px] text-grafia">
          <span>1 · extrema esquerda</span>
          <span className="font-medium text-tinta">
            desta turma, de {menor} a {maior}
          </span>
          <span>extrema direita · 100</span>
        </div>
      </div>
    </div>
  )
}

// Casco convexo (monotone chain). Sem ele o "territorio" viraria um poligono
// com os pontos na ordem em que foram escritos, que se auto-cruza e parece
// erro de renderizacao.
function envolver(pontos) {
  const ps = [...pontos].map(p => ({ x: p.x, y: p.y }))
    .sort((a, b) => a.x - b.x || a.y - b.y)
  if (ps.length < 3) return ps

  const cruz = (o, a, b) => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x)
  const meia = (lista) => {
    const saida = []
    for (const p of lista) {
      while (saida.length >= 2 && cruz(saida.at(-2), saida.at(-1), p) <= 0) saida.pop()
      saida.push(p)
    }
    saida.pop()
    return saida
  }
  return [...meia(ps), ...meia([...ps].reverse())]
}
