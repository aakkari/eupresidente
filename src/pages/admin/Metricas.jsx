import { useEffect, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { adminMetricas } from '../../lib/api.js'

export default function Metricas() {
  const { token } = useOutletContext()
  const [m, setM] = useState(null)
  const [erro, setErro] = useState(null)

  useEffect(() => { adminMetricas(token).then(setM).catch(e => setErro(e.message)) }, [])

  if (erro) return <p className="text-red-700">{erro}</p>
  if (!m) return <p className="text-grafia">Carregando...</p>

  const arquetipos = Object.entries(m.distribuicao_arquetipos).sort((a, b) => b[1] - a[1])
  const maior = arquetipos[0]?.[1] ?? 1

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Tile n={m.sessoes.total} r="sessões" />
        <Tile n={m.sessoes.completas} r="concluidas" />
        <Tile n={m.sessoes.conclusao !== null ? `${Math.round(m.sessoes.conclusao * 100)}%` : '—'} r="conclusão" />
        <Tile n={m.research_pool} r="na pesquisa" />
      </div>

      <section>
        <h2 className="rotulo mb-2">Distribuição de arquétipos</h2>
        <p className="mb-3 text-sm text-grafia">
          Arquétipo que nunca aparece tem centroide mal posicionado. Arquétipo que leva
          quase tudo significa que o instrumento não está discriminando.
        </p>
        {arquetipos.length === 0
          ? <p className="text-sm text-grafia">Nenhum resultado ainda.</p>
          : (
            <div className="space-y-1.5">
              {arquetipos.map(([id, n]) => (
                <div key={id} className="flex items-center gap-3 text-sm">
                  <span className="w-56 shrink-0 truncate">{id}</span>
                  <div className="h-4 flex-1 rounded bg-borda">
                    <div className="h-4 rounded bg-tinta" style={{ width: `${(n / maior) * 100}%` }} />
                  </div>
                  <span className="w-10 text-right tabular-nums text-grafia">{n}</span>
                </div>
              ))}
            </div>
          )}
      </section>

      <section>
        <h2 className="rotulo mb-2">Consistência média por eixo</h2>
        <p className="mb-3 text-sm text-grafia">
          Eixo consistentemente baixo significa pergunta invertida mal redigida: a pessoa
          não percebeu que era o contrário, e o eixo passa a medir leitura em vez de opinião.
          Abaixo de 0,6 vale reescrever.
        </p>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
          {Object.entries(m.consistencia_por_eixo).map(([eixo, v]) => (
            <div key={eixo} className={`cartao p-3 ${v !== null && v < 0.6 ? 'border-red-400' : ''}`}>
              <div className="rotulo">{eixo}</div>
              <div className="mt-1 text-lg tabular-nums">{v ?? '—'}</div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="rotulo mb-2">Qualidade</h2>
        <div className="flex flex-wrap gap-2 text-sm">
          {Object.keys(m.quality_flags).length === 0
            ? <span className="text-grafia">Nenhuma resposta sinalizada.</span>
            : Object.entries(m.quality_flags).map(([f, n]) => (
                <span key={f} className="cartao px-3 py-1.5">{f}: <strong>{n}</strong></span>
              ))}
          <span className="cartao px-3 py-1.5">
            taxa média de "sem posição": <strong>{m.neutral_rate_medio ?? '—'}</strong>
          </span>
        </div>
      </section>
    </div>
  )
}

const Tile = ({ n, r }) => (
  <div className="cartao p-4">
    <div className="text-2xl tabular-nums">{n}</div>
    <div className="rotulo mt-1">{r}</div>
  </div>
)
