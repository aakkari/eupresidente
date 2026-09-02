import { useMemo, useState } from 'react'

// Como a posicao da pessoa mudou ao longo do tempo.
//
// Com um ponto so nao ha o que mostrar, e o componente se cala em vez de
// desenhar uma linha de um ponto — grafico com uma amostra e decoracao.
const PERIODOS = [
  { id: '90',   nome: '90 dias', dias: 90 },
  { id: '365',  nome: '1 ano',   dias: 365 },
  { id: 'tudo', nome: 'Tudo',    dias: null },
]

export default function Evolucao({ resultados = [] }) {
  const [periodo, setPeriodo] = useState('tudo')

  const pontos = useMemo(() => {
    const dias = PERIODOS.find(p => p.id === periodo)?.dias
    const corte = dias ? Date.now() - dias * 864e5 : null
    return resultados
      .filter(r => r.posicao && (!corte || new Date(r.quando).getTime() >= corte))
      .map(r => ({ x: new Date(r.quando).getTime(), y: r.posicao.posicao, familia: r.familia, quando: r.quando }))
      .sort((a, b) => a.x - b.x)
  }, [resultados, periodo])

  if (resultados.length < 2) {
    return (
      <p className="text-sm leading-relaxed text-grafia">
        A evolução aparece quando você tiver respondido pelo menos duas vezes. Refazer o
        questionário daqui a alguns meses é a forma mais honesta de ver se você mudou —
        ou se o instrumento é estável.
      </p>
    )
  }

  const W = 100, H = 34
  const x0 = pontos[0]?.x ?? 0
  const x1 = pontos[pontos.length - 1]?.x ?? 1
  const px = t => x1 === x0 ? W / 2 : 4 + ((t - x0) / (x1 - x0)) * (W - 8)
  const py = v => 4 + (1 - v / 100) * (H - 8)
  const caminho = pontos.map((p, i) => `${i ? 'L' : 'M'}${px(p.x).toFixed(2)},${py(p.y).toFixed(2)}`).join(' ')

  const primeiro = pontos[0], ultimo = pontos[pontos.length - 1]
  const delta = pontos.length > 1 ? ultimo.y - primeiro.y : 0

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1.5">
          {PERIODOS.map(p => (
            <button key={p.id} onClick={() => setPeriodo(p.id)}
              className={`rounded-full px-3 py-1.5 text-xs transition ${
                p.id === periodo ? 'bg-tinta text-papel' : 'border border-borda bg-white hover:border-tinta'}`}>
              {p.nome}
            </button>
          ))}
        </div>
        {pontos.length > 1 && (
          <p className="text-xs text-grafia">
            {delta === 0
              ? 'Mesma posição no início e no fim do período.'
              : `${Math.abs(delta)} ponto${Math.abs(delta) > 1 ? 's' : ''} para a ${delta < 0 ? 'esquerda' : 'direita'} no período.`}
          </p>
        )}
      </div>

      {pontos.length < 2 ? (
        <p className="text-sm text-grafia">Nenhum resultado neste período.</p>
      ) : (
        <>
          <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img"
               aria-label="Evolução da sua posição política ao longo do tempo">
            {[0, 50, 100].map(v => (
              <g key={v}>
                <line x1="4" y1={py(v)} x2={W - 4} y2={py(v)}
                      stroke={v === 50 ? '#a3a3a8' : '#e4e4e4'} strokeWidth="0.3" />
                <text x="0" y={py(v) + 1.2} fontSize="2.4" fill="#a3a3a8">{v}</text>
              </g>
            ))}
            <path d={caminho} fill="none" stroke="#0a0a0b" strokeWidth="0.7"
                  strokeLinecap="round" strokeLinejoin="round" />
            {pontos.map((p, i) => (
              <circle key={i} cx={px(p.x)} cy={py(p.y)} r="1.3" fill="#fff"
                      stroke="#0a0a0b" strokeWidth="0.7">
                <title>{`${p.y} · ${p.familia} · ${new Date(p.quando).toLocaleDateString('pt-BR')}`}</title>
              </circle>
            ))}
          </svg>

          <div className="mt-2 flex justify-between text-[11px] text-tenue">
            <span>{new Date(primeiro.quando).toLocaleDateString('pt-BR')}</span>
            <span>1 = esquerda · 100 = direita</span>
            <span>{new Date(ultimo.quando).toLocaleDateString('pt-BR')}</span>
          </div>
        </>
      )}
    </div>
  )
}
