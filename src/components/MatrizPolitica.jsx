import { useMemo, useState } from 'react'
import { tinta } from '../lib/cor'
import { VISTAS, caixa, distribuirRotulos, afastado } from '../lib/matriz.js'

const c = caixa({ W: 560, H: 460 })
const { W, H, L, R, T, B, px, py } = c

export default function MatrizPolitica({ vetor, familias, minhaFamilia }) {
  const [vistaId, setVista] = useState('classico')
  const [ativo, setAtivo] = useState(null)
  const vista = VISTAS.find(v => v.id === vistaId)

  const pontos = useMemo(() => {
    const base = (familias ?? []).map(f => ({
    id: f.id, nome: f.name,
    x: px(Number(f.centroid?.[vista.x.eixo] ?? 0)),
    y: py(Number(f.centroid?.[vista.y.eixo] ?? 0), vista.y.inverter),
    // Distância só nas duas dimensões desenhadas — é o que a pessoa vê.
    d: Math.hypot(Number(f.centroid?.[vista.x.eixo] ?? 0) - Number(vetor?.[vista.x.eixo] ?? 0),
                  Number(f.centroid?.[vista.y.eixo] ?? 0) - Number(vetor?.[vista.y.eixo] ?? 0)),
    })).sort((a, b) => a.d - b.d)

    return distribuirRotulos(base, { c, cantos: vista.cantos })
  }, [familias, vista, vetor])

  const eu = { x: px(Number(vetor?.[vista.x.eixo] ?? 0)),
               y: py(Number(vetor?.[vista.y.eixo] ?? 0), vista.y.inverter) }
  const cor = tinta(minhaFamilia?.color)
  // Todas rotuladas. Hover nao existe em celular, e ponto sem nome nao informa
  // nada — o halo branco no texto resolve a legibilidade na sobreposicao.
  const proximas = new Set(pontos.slice(0, 3).map(p => p.id))

  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-1.5">
        {VISTAS.map(v => (
          <button key={v.id} onClick={() => setVista(v.id)}
            className={`rounded-md px-3 py-1.5 text-xs transition ${
              v.id === vistaId ? 'bg-tinta text-papel' : 'border border-borda bg-white hover:border-tinta'}`}>
            {v.nome}
          </button>
        ))}
      </div>

      <div className="cartao overflow-hidden">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img"
             aria-label={`Matriz ${vista.nome} com sua posição e as 15 famílias políticas`}>
          <rect x={L} y={T} width={W-L-R} height={H-T-B} fill="#fff" />

          {/* Quadrantes: fundo alternado bem discreto, para dar leitura sem competir. */}
          <rect x={L} y={T} width={(W-L-R)/2} height={(H-T-B)/2} fill="#12141a" opacity="0.025" />
          <rect x={L+(W-L-R)/2} y={T+(H-T-B)/2} width={(W-L-R)/2} height={(H-T-B)/2} fill="#12141a" opacity="0.025" />

          {[0.25, 0.5, 0.75].map(f => (
            <g key={f}>
              <line x1={L+(W-L-R)*f} y1={T} x2={L+(W-L-R)*f} y2={H-B}
                    stroke="#dcd7cc" strokeWidth={f === 0.5 ? 1.5 : 1} />
              <line x1={L} y1={T+(H-T-B)*f} x2={W-R} y2={T+(H-T-B)*f}
                    stroke="#dcd7cc" strokeWidth={f === 0.5 ? 1.5 : 1} />
            </g>
          ))}

          {vista.cantos.map((nome, i) => (
            <text key={nome} fontSize="9" fill="#5b5f6b" opacity="0.75"
                  textAnchor={i % 2 ? 'end' : 'start'}
                  x={i % 2 ? W-R-8 : L+8} y={i < 2 ? T+14 : H-B-7}>{nome}</text>
          ))}

          {/* Famílias: pontos neutros. A identidade vem do rótulo, não da cor —
              15 cores categóricas não passam em nenhum teste de daltonismo. */}
          {pontos.map(p => (
            <g key={p.id} onMouseEnter={() => setAtivo(p)} onMouseLeave={() => setAtivo(null)}
               style={{ cursor: 'default' }}>
              <circle cx={p.x} cy={p.y} r="11" fill="transparent" />
              <circle cx={p.x} cy={p.y} r={ativo?.id === p.id ? 5.5 : 4}
                      fill="#fff" stroke="#5b5f6b" strokeWidth="2" />
              {/* Linha guia quando o rotulo foi empurrado para longe do ponto. */}
              {afastado(p) && (
                <line x1={p.x + (p.aDireita ? -5 : 5)} y1={p.y}
                      x2={p.x + (p.aDireita ? -7 : 7)} y2={p.ly - 3}
                      stroke="#b9b4a9" strokeWidth="1" />
              )}
              <text x={p.x + (p.aDireita ? -7 : 7)} y={p.ly} fill="#12141a"
                    textAnchor={p.aDireita ? 'end' : 'start'}
                    fontSize={proximas.has(p.id) || ativo?.id === p.id ? 10 : 8.5}
                    fontWeight={proximas.has(p.id) ? 600 : 400}
                    opacity={proximas.has(p.id) || ativo?.id === p.id ? 1 : 0.62}
                    stroke="#fff" strokeWidth="3" paintOrder="stroke">{p.nome}</text>
            </g>
          ))}

          {/* Você: anel de superfície de 2px para nunca sumir sob outro ponto. */}
          <circle cx={eu.x} cy={eu.y} r="11" fill="none" stroke={cor} strokeWidth="1.5" opacity="0.35" />
          <circle cx={eu.x} cy={eu.y} r="6.5" fill={cor} stroke="#fff" strokeWidth="2.5" />
          <text x={eu.x} y={eu.y - 14} fontSize="11" fontWeight="600" textAnchor="middle"
                fill="#12141a" stroke="#fff" strokeWidth="3.5" paintOrder="stroke">você</text>

          <text x={L} y={H-14} fontSize="10" fill="#5b5f6b">{vista.x.esq}</text>
          <text x={W-R} y={H-14} fontSize="10" fill="#5b5f6b" textAnchor="end">{vista.x.dir}</text>
          {/* py() coloca valor alto no topo, entao o topo recebe y.cima.
              Estavam trocados, e a imagem se contradizia: o eixo dizia
              "liberdade civil" em cima e o quadrante dizia "autoritaria". */}
          <text x={13} y={T+8} fontSize="10" fill="#5b5f6b" transform={`rotate(-90 13 ${T+8})`}
                textAnchor="end">{vista.y.cima}</text>
          <text x={13} y={H-B-2} fontSize="10" fill="#5b5f6b" transform={`rotate(-90 13 ${H-B-2})`}
                textAnchor="start">{vista.y.baixo}</text>
        </svg>
      </div>

      {/* Tabela: a mesma informação sem depender de enxergar o gráfico. */}
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-grafia">
        <span className="font-medium text-tinta">Mais perto de você nesta vista:</span>
        {pontos.slice(0, 4).map((p, i) => (
          <span key={p.id}>{i + 1}. {p.nome} <span className="tabular-nums">({p.d.toFixed(2)})</span></span>
        ))}
      </div>
    </div>
  )
}
