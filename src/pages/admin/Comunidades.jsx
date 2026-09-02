import { useEffect, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { adminComunidades } from '../../lib/api.js'

export default function Comunidades() {
  const { token } = useOutletContext()
  const [d, setD] = useState(null)
  const [erro, setErro] = useState(null)
  const [aberta, setAberta] = useState(null)

  useEffect(() => { adminComunidades(token).then(setD).catch(e => setErro(e.message)) }, [token])

  if (erro) return <p className="text-sm text-red-700">{erro}</p>
  if (!d) return <p className="text-grafia">Carregando...</p>

  return (
    <div>
      <h2 className="subtitulo text-2xl">Comunidades</h2>

      <div className="my-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Tile n={d.totais.comunidades} r="comunidades" />
        <Tile n={d.totais.pessoas} r="pessoas dentro" />
        <Tile n={d.totais.media_por_comunidade} r="média por comunidade" />
        <Tile n={d.totais.taxa_aceite != null ? `${Math.round(d.totais.taxa_aceite * 100)}%` : '—'}
              r="convites respondidos que viraram entrada" />
      </div>

      {!d.comunidades.length && <p className="text-grafia">Ninguém criou nenhuma ainda.</p>}

      <div className="cartao divide-y divide-borda">
        {d.comunidades.map(c => (
          <div key={c.id}>
            <button onClick={() => setAberta(a => a === c.id ? null : c.id)}
                    className="flex w-full flex-wrap items-center gap-3 p-4 text-left transition hover:bg-papel">
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium">{c.nome}</span>
                <span className="block truncate text-xs text-grafia">
                  de {c.dono} · desde {new Date(c.criada_em).toLocaleDateString('pt-BR')}
                </span>
              </span>
              <span className="shrink-0 text-xs tabular-nums text-grafia">
                {c.membros} {c.membros === 1 ? 'pessoa' : 'pessoas'}
                {c.no_mapa < c.membros && ` · ${c.membros - c.no_mapa} fora do mapa`}
              </span>
              {c.convites_pendentes > 0 && (
                <span className="shrink-0 text-xs text-tenue">{c.convites_pendentes} convidadas</span>
              )}
              <span className="w-12 shrink-0 text-right text-lg font-semibold tabular-nums">
                {c.posicao_media ?? '—'}
              </span>
              <span className="w-24 shrink-0 text-right text-xs tabular-nums text-tenue"
                    title="desvio padrão da posição dentro do grupo">
                {c.dispersao != null ? `±${c.dispersao}` : ''}
              </span>
            </button>

            {aberta === c.id && (
              <div className="border-t border-borda bg-papel p-5">
                <p className="mb-3 max-w-2xl text-xs leading-relaxed text-grafia">
                  A dispersão (±) diz o quanto a comunidade discorda de si mesma.
                  {c.dispersao != null && (
                    <> Esta está em <strong className="text-tinta">±{c.dispersao}</strong> —{' '}
                    {c.dispersao < 10 ? 'gente que pensa quase igual.'
                      : c.dispersao < 25 ? 'variação normal dentro de um grupo.'
                      : 'gente que discorda bastante sentada na mesma mesa.'}</>
                  )}
                </p>

                <div className="cartao divide-y divide-borda">
                  {c.pessoas.map((p, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 text-sm">
                      <span className="w-10 shrink-0 font-semibold tabular-nums">
                        {p.posicao ?? '—'}
                      </span>
                      <span className="min-w-0 flex-1 truncate">{p.nome}</span>
                      {!p.no_mapa && <span className="shrink-0 text-xs text-tenue">fora do mapa</span>}
                      <span className="shrink-0 text-xs text-tenue">
                        {new Date(p.desde).toLocaleDateString('pt-BR')}
                      </span>
                    </div>
                  ))}
                </div>

                <p className="mt-3 text-xs text-tenue">
                  Convites: {c.convites_aceitos} aceitos · {c.convites_pendentes} pendentes ·{' '}
                  {c.convites_recusados} recusados
                </p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

const Tile = ({ n, r }) => (
  <div className="cartao p-4">
    <div className="text-2xl font-semibold tabular-nums tracking-apertado">{n ?? '—'}</div>
    <div className="rotulo mt-1.5">{r}</div>
  </div>
)
