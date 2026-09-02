import { useEffect, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { adminPopulacao } from '../../lib/api.js'

// O todo e os recortes.
const RECORTES = [
  ['uf', 'Por estado'], ['faixa_etaria', 'Por faixa etária'],
  ['escolaridade', 'Por escolaridade'], ['ocupacao', 'Por ocupação'],
]

export default function Populacao() {
  const { token } = useOutletContext()
  const [d, setD] = useState(null)
  const [erro, setErro] = useState(null)

  useEffect(() => { adminPopulacao(token).then(setD).catch(e => setErro(e.message)) }, [token])

  if (erro) return <p className="text-sm text-red-700">{erro}</p>
  if (!d) return <p className="text-grafia">Carregando...</p>
  if (!d.total) return <p className="text-grafia">Nenhum resultado ainda.</p>

  const maior = Math.max(...d.escala.map(b => b.n), 1)

  return (
    <div className="space-y-10">
      <section>
        <h2 className="subtitulo text-2xl">Onde as pessoas caem</h2>
        <p className="mb-4 mt-1 text-sm text-grafia">
          {d.total} {d.total === 1 ? 'resultado' : 'resultados'}. Se a curva empilhar tudo no
          meio, o instrumento não está discriminando.
        </p>

        <div className="cartao p-5">
          {/* items-stretch (o padrao) e nao items-end: com items-end cada coluna
              encolhe ate a altura do conteudo, a altura em % da barra resolve
              para zero e o grafico sai sem barra nenhuma. */}
          <div className="flex gap-1" style={{ height: 160 }}>
            {d.escala.map(b => (
              <div key={b.de} className="flex flex-1 flex-col items-center justify-end gap-1.5">
                <span className="text-[10px] tabular-nums text-grafia">{b.n || ''}</span>
                <div className="w-full rounded-t bg-tinta"
                     style={{ height: `${Math.max(b.n ? 3 : 0, (b.n / maior) * 100)}%` }} />
                <span className="text-[10px] tabular-nums text-tenue">{b.de}</span>
              </div>
            ))}
          </div>
          <div className="mt-2 flex justify-between text-[11px] text-grafia">
            <span>1 · extrema esquerda</span><span>50 · centro</span><span>extrema direita · 100</span>
          </div>
        </div>
      </section>

      <div className="grid gap-8 lg:grid-cols-2">
        <Contagem titulo="Por faixa" itens={d.por_rotulo} total={d.total} />
        <Contagem titulo="Por família" itens={d.por_familia} total={d.total} />
      </div>

      <section>
        <h2 className="subtitulo text-2xl">Por grupo</h2>
        <p className="mb-4 mt-1 max-w-2xl text-sm leading-relaxed text-grafia">
          Sai do perfil que a pessoa preencheu na conta. {d.sem_perfil > 0 && (
            <><strong className="text-tinta">{d.sem_perfil} resultados não entram em recorte
            nenhum</strong> porque não têm perfil preenchido — quem responde sem conta nunca
            terá. </>
          )}
          Grupo com menos de {d.piso_confiavel} pessoas vem marcado: o número existe, mas não
          quer dizer nada ainda.
        </p>

        <div className="grid gap-6 lg:grid-cols-2">
          {RECORTES.map(([campo, titulo]) => (
            <Recorte key={campo} titulo={titulo} linhas={d.recortes[campo]} />
          ))}
        </div>
      </section>

      <section>
        <h2 className="subtitulo text-2xl">Tempo de resposta</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <Tile n={d.tempo.concluidas} r="questionários concluídos" />
          <Tile n={formatar(d.tempo.duracao_mediana_s)} r="duração mediana" />
          <Tile n={d.tempo.sessoes_medidas} r="sessões medidas" />
        </div>

        {d.tempo.perguntas_mais_lentas?.length > 0 && (
          <div className="cartao mt-4 divide-y divide-borda">
            <p className="rotulo p-4 pb-2">
              Perguntas em que as pessoas mais param
              <span className="ml-2 font-normal normal-case tracking-normal text-tenue">
                candidatas a reescrita — parada longa costuma ser enunciado confuso
              </span>
            </p>
            {d.tempo.perguntas_mais_lentas.map(p => (
              <div key={p.id} className="flex items-center gap-3 p-3.5 text-sm">
                <code className="w-16 shrink-0 text-xs">{p.id}</code>
                <div className="h-1.5 flex-1 rounded-full bg-borda">
                  <div className="h-full rounded-full bg-tinta"
                       style={{ width: `${Math.min(100, (p.mediana_s / (d.tempo.perguntas_mais_lentas[0].mediana_s || 1)) * 100)}%` }} />
                </div>
                <span className="w-20 shrink-0 text-right tabular-nums">{p.mediana_s}s</span>
                <span className="w-14 shrink-0 text-right text-xs tabular-nums text-tenue">n={p.n}</span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

const Contagem = ({ titulo, itens, total }) => (
  <section>
    <h2 className="subtitulo text-xl">{titulo}</h2>
    <div className="cartao mt-3 divide-y divide-borda">
      {itens.map(i => (
        <div key={i.nome} className="flex items-center gap-3 p-3 text-sm">
          <span className="min-w-0 flex-1 truncate">{i.nome}</span>
          <div className="h-1.5 w-24 shrink-0 rounded-full bg-borda">
            <div className="h-full rounded-full bg-tinta"
                 style={{ width: `${(i.n / (itens[0]?.n || 1)) * 100}%` }} />
          </div>
          <span className="w-10 shrink-0 text-right tabular-nums">{i.n}</span>
          <span className="w-12 shrink-0 text-right text-xs tabular-nums text-tenue">
            {Math.round((i.n / total) * 100)}%
          </span>
        </div>
      ))}
      {!itens.length && <p className="p-3 text-sm text-grafia">Nada ainda.</p>}
    </div>
  </section>
)

const Recorte = ({ titulo, linhas }) => (
  <div>
    <h3 className="rotulo mb-2">{titulo}</h3>
    <div className="cartao divide-y divide-borda">
      {linhas.map(l => (
        <div key={l.nome} className="flex items-center gap-3 p-3 text-sm">
          <span className="min-w-0 flex-1 truncate">{l.nome}</span>
          <span className="w-12 shrink-0 text-right text-xs tabular-nums text-tenue">n={l.n}</span>
          <span className={`w-12 shrink-0 text-right font-semibold tabular-nums ${
            l.confiavel ? '' : 'text-grafia'}`}>{l.posicao_media}</span>
          {!l.confiavel && (
            <span className="shrink-0 text-[10px] text-tenue" title="amostra pequena demais">
              amostra pequena
            </span>
          )}
        </div>
      ))}
      {!linhas.length && <p className="p-3 text-sm text-grafia">Ninguém preencheu ainda.</p>}
    </div>
  </div>
)

const Tile = ({ n, r }) => (
  <div className="cartao p-4">
    <div className="text-2xl font-semibold tabular-nums tracking-apertado">{n ?? '—'}</div>
    <div className="rotulo mt-1.5">{r}</div>
  </div>
)

function formatar(s) {
  if (s == null) return null
  const m = Math.floor(s / 60)
  return m ? `${m}min${String(s % 60).padStart(2, '0')}` : `${s}s`
}
