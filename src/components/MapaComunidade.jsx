import { useMemo, useState } from 'react'
import { VISTAS, caixa, distribuirRotulos, afastado } from '../lib/matriz.js'

// O mapa da comunidade: cada pessoa e um ponto com o nome dela.
//
// Maior que a matriz do report de proposito — aqui os pontos sao pessoas
// conhecidas e o nome e o conteudo, nao um adorno. As 15 familias continuam
// desenhadas ao fundo, sem rotulo e bem apagadas: sem elas o mapa vira uma
// nuvem de pontos sem referencia, e "meu primo esta ali" nao quer dizer nada.
const c = caixa({ W: 760, H: 560, L: 46, R: 26, T: 24, B: 46 })
const { W, H, L, R, T, B, px, py } = c

export default function MapaComunidade({ membros = [], familias = [], eu }) {
  const [vistaId, setVista] = useState('classico')
  const [ativo, setAtivo] = useState(null)
  const vista = VISTAS.find(v => v.id === vistaId)

  const comPosicao = membros.filter(m => m.vector)

  const pontos = useMemo(() => {
    const base = comPosicao.map(m => ({
      id: m.user_id, nome: m.nome, souEu: Boolean(m.sou_eu),
      posicao: m.posicao?.posicao, familia: m.familia,
      x: px(Number(m.vector?.[vista.x.eixo] ?? 0)),
      y: py(Number(m.vector?.[vista.y.eixo] ?? 0), vista.y.inverter),
    }))
    return distribuirRotulos(base, { c, cantos: vista.cantos, larguraTexto: 110 })
  }, [membros, vista, eu])

  const fundo = useMemo(() => (familias ?? []).map(f => ({
    id: f.id,
    x: px(Number(f.centroid?.[vista.x.eixo] ?? 0)),
    y: py(Number(f.centroid?.[vista.y.eixo] ?? 0), vista.y.inverter),
  })), [familias, vista])

  if (!comPosicao.length) return null

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
             aria-label={`Mapa ${vista.nome} com ${pontos.length} pessoas da comunidade`}>
          <rect x={L} y={T} width={W-L-R} height={H-T-B} fill="#fff" />

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
            <text key={nome} fontSize="9.5" fill="#5b5f6b" opacity="0.7"
                  textAnchor={i % 2 ? 'end' : 'start'}
                  x={i % 2 ? W-R-8 : L+8} y={i < 2 ? T+14 : H-B-7}>{nome}</text>
          ))}

          {/* Familias ao fundo: referencia, nao conteudo. */}
          {fundo.map(f => (
            <circle key={f.id} cx={f.x} cy={f.y} r="3" fill="none"
                    stroke="#12141a" strokeWidth="1" opacity="0.13" />
          ))}

          {pontos.map(p => (
            <g key={p.id} onMouseEnter={() => setAtivo(p)} onMouseLeave={() => setAtivo(null)}>
              <circle cx={p.x} cy={p.y} r="13" fill="transparent" />
              {afastado(p) && (
                <line x1={p.x + (p.aDireita ? -6 : 6)} y1={p.y}
                      x2={p.x + (p.aDireita ? -8 : 8)} y2={p.ly - 3}
                      stroke="#b9b4a9" strokeWidth="1" />
              )}
              {/* Voce ganha anel de superficie para nunca sumir sob outro ponto;
                  todo mundo e desenhado igual no resto — um mapa em que o dono
                  aparece maior conta a historia errada sobre o grupo. */}
              {p.souEu && (
                <circle cx={p.x} cy={p.y} r="12" fill="none"
                        stroke="#12141a" strokeWidth="1.5" opacity="0.3" />
              )}
              <circle cx={p.x} cy={p.y} r={ativo?.id === p.id ? 7 : 5.5}
                      fill={p.souEu ? '#12141a' : '#fff'}
                      stroke="#12141a" strokeWidth="2" />
              <text x={p.x + (p.aDireita ? -9 : 9)} y={p.ly} fill="#12141a"
                    textAnchor={p.aDireita ? 'end' : 'start'}
                    fontSize={p.souEu || ativo?.id === p.id ? 11.5 : 10.5}
                    fontWeight={p.souEu ? 700 : 500}
                    stroke="#fff" strokeWidth="3.5" paintOrder="stroke">
                {p.souEu ? `${p.nome} (você)` : p.nome}
              </text>
            </g>
          ))}

          <text x={L} y={H-14} fontSize="10.5" fill="#5b5f6b">{vista.x.esq}</text>
          <text x={W-R} y={H-14} fontSize="10.5" fill="#5b5f6b" textAnchor="end">{vista.x.dir}</text>
          {/* py() poe valor alto no topo: o topo recebe y.cima. Ja errei isso
              uma vez na matriz do report, e a imagem passou a se contradizer —
              o eixo dizia uma coisa e o nome do quadrante dizia a oposta. */}
          <text x={14} y={T+8} fontSize="10.5" fill="#5b5f6b"
                transform={`rotate(-90 14 ${T+8})`} textAnchor="end">{vista.y.cima}</text>
          <text x={14} y={H-B-2} fontSize="10.5" fill="#5b5f6b"
                transform={`rotate(-90 14 ${H-B-2})`} textAnchor="start">{vista.y.baixo}</text>
        </svg>
      </div>

      <p className="mt-2 text-xs leading-relaxed text-tenue">
        Os círculos apagados ao fundo são as {familias.length} famílias políticas — servem só de
        referência, para "fulano está ali" querer dizer alguma coisa.
      </p>

      {ativo && (
        <p className="mt-2 text-xs text-grafia">
          <strong className="text-tinta">{ativo.nome}</strong>
          {ativo.posicao != null && ` · ${ativo.posicao} de 100`}
          {ativo.familia && ` · ${ativo.familia}`}
        </p>
      )}
    </div>
  )
}
