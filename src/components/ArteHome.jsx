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
