import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { buscarResultado } from '../lib/api.js'
import ReguaPolitica from '../components/ReguaPolitica.jsx'
import MatrizPolitica from '../components/MatrizPolitica.jsx'

const EIXOS = ['ECO', 'SOC', 'AUT', 'NAC', 'DEM', 'AMB']

export default function Resultado() {
  const [params] = useSearchParams()
  const [dados, setDados] = useState(null)
  const [erro, setErro] = useState(null)
  const token = params.get('token')

  useEffect(() => {
    if (!token) return setErro('link sem token')
    buscarResultado(token).then(setDados).catch(e => setErro(e.message))
  }, [token])

  if (erro) return <Aviso>{erro}</Aviso>
  if (!dados) return <Aviso>Carregando...</Aviso>

  const { resultado, arquetipo: a, arquetipo_secundario, instrumento, posicao, todos_arquetipos } = dados
  const eixos = instrumento?.axes ?? {}
  const cor = a?.color ?? '#12141a'

  return (
    <div className="pb-24">
      {/* Capa: o nome primeiro, com a cor da família como assinatura. */}
      <header className="border-b border-borda" style={{ background: `${cor}0f` }}>
        <div className="mx-auto max-w-3xl px-6 py-14">
          <p className="rotulo">Sua família política</p>
          <h1 className="mt-2 font-serif text-5xl leading-[1.05] sm:text-6xl">{a?.name}</h1>
          <p className="mt-3 max-w-xl text-lg text-grafia">{a?.tagline}</p>
        </div>
      </header>

      <div className="mx-auto max-w-3xl space-y-14 px-6 pt-10">
        <ReguaPolitica posicao={posicao} />

        <Secao titulo="Onde você cai no mapa"
               subtitulo="As 15 famílias são os pontos de referência; você é o ponto colorido. Troque os eixos para ver combinações que um quadrante só esconde.">
          <MatrizPolitica vetor={resultado.vector} familias={todos_arquetipos} minhaFamilia={a} />
        </Secao>

        <Secao titulo="O que isso quer dizer">
          <p className="texto">{a?.description}</p>
          {arquetipo_secundario && (
            <p className="mt-4 border-l-2 pl-4 text-sm leading-relaxed text-grafia" style={{ borderColor: cor }}>
              Você ficou a uma distância parecida de <strong className="text-tinta">{arquetipo_secundario.name}</strong>.
              Isso não é indecisão: é sinal de que você combina duas tradições que costumam andar separadas.
            </p>
          )}
        </Secao>

        {a?.history && (
          <Secao titulo="De onde vem">
            <p className="texto">{a.history}</p>
          </Secao>
        )}

        {a?.curiosities?.length > 0 && (
          <Secao titulo="Coisas que quase ninguém sabe">
            <div className="grid gap-3 sm:grid-cols-2">
              {a.curiosities.map((c, i) => (
                <article key={i} className="cartao p-4">
                  <h3 className="text-sm font-semibold">{c.titulo}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-grafia">{c.texto}</p>
                </article>
              ))}
            </div>
          </Secao>
        )}

        {a?.figures?.length > 0 && (
          <Secao titulo="Quem carregou isso" subtitulo="Figuras históricas dessa tradição — pelo que fizeram, não por rótulo que alguém colou nelas.">
            <div className="grid gap-3 sm:grid-cols-2">
              {a.figures.map((f, i) => (
                <article key={i} className="cartao flex gap-3 p-4">
                  <div className="mt-1 h-full w-0.5 shrink-0 rounded" style={{ background: cor }} />
                  <div>
                    <h3 className="text-sm font-semibold">{f.nome}</h3>
                    <p className="text-[11px] uppercase tracking-wide text-grafia">{f.periodo} · {f.pais}</p>
                    <p className="mt-1.5 text-sm leading-relaxed text-grafia">{f.nota}</p>
                  </div>
                </article>
              ))}
            </div>
          </Secao>
        )}

        {(a?.strengths?.length > 0 || a?.weaknesses?.length > 0) && (
          <Secao titulo="Forças e fraquezas" subtitulo="As duas listas foram escritas com o mesmo rigor. A segunda inclui as críticas que essa tradição recebe dos próprios aliados.">
            <div className="grid gap-4 sm:grid-cols-2">
              <Lista itens={a.strengths} titulo="No que é forte" cor={cor} />
              <Lista itens={a.weaknesses} titulo="Onde costuma falhar" cor="#8a8a8a" />
            </div>
          </Secao>
        )}

        {a?.blind_spots && (
          <Secao titulo="O ponto cego">
            <p className="texto">{a.blind_spots}</p>
          </Secao>
        )}

        {a?.countries?.length > 0 && (
          <Secao titulo="No mundo" subtitulo="Onde essa tradição é forte, onde é irrelevante, e por quê.">
            <div className="cartao divide-y divide-borda">
              {a.countries.map((c, i) => (
                <div key={i} className="flex flex-wrap items-baseline gap-x-3 gap-y-1 p-3.5">
                  <span className="w-36 shrink-0 font-medium">{c.pais}</span>
                  <Forca nivel={c.forca} cor={cor} />
                  <span className="w-full text-sm text-grafia sm:w-auto sm:flex-1">
                    {c.partido && c.partido !== '—' && <strong className="text-tinta">{c.partido}. </strong>}
                    {c.nota}
                  </span>
                </div>
              ))}
            </div>
          </Secao>
        )}

        <Secao titulo="Seus seis eixos" subtitulo="A escala de 1 a 100 nasce dos dois primeiros. Os outros quatro não cabem nela — e é por isso que existem.">
          <div className="cartao divide-y divide-borda px-4">
            {EIXOS.map(e => (
              <Eixo key={e} meta={eixos[e]} valor={Number(resultado.vector?.[e] ?? 0)}
                    confianca={Number(resultado.confidence?.[e] ?? 0)} cor={cor} />
            ))}
          </div>
        </Secao>

        {resultado.tensions?.length > 0 && (
          <Secao titulo="Onde você não cabe na caixa"
                 subtitulo="Nestes eixos você se afasta da sua própria família. Ninguém é a média da tradição que o descreve.">
            <div className="space-y-2">
              {resultado.tensions.map(e => (
                <div key={e} className="cartao p-4">
                  <h3 className="text-sm font-semibold">{eixos[e]?.nome ?? e}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-grafia">
                    Você está em <strong className="text-tinta">{Number(resultado.vector[e]).toFixed(2)}</strong>,
                    enquanto {a?.name} costuma ficar em {Number(a?.centroid?.[e] ?? 0).toFixed(2)}.
                  </p>
                </div>
              ))}
            </div>
          </Secao>
        )}

        {resultado.quality_flags?.length > 0 && (
          <p className="text-xs leading-relaxed text-grafia">
            Marcamos esta resposta como {resultado.quality_flags.join(', ')} — por isso ela não entra
            na base de pesquisa. Seu resultado continua valendo para você.
          </p>
        )}

        <p className="border-t border-borda pt-6 text-xs text-grafia">
          Guarde este link: é por ele que você volta ao seu resultado.
        </p>
      </div>
    </div>
  )
}

const Aviso = ({ children }) => <p className="mx-auto max-w-2xl px-6 py-20 text-grafia">{children}</p>

const Secao = ({ titulo, subtitulo, children }) => (
  <section>
    <h2 className="font-serif text-2xl">{titulo}</h2>
    {subtitulo && <p className="mb-4 mt-1 max-w-2xl text-sm text-grafia">{subtitulo}</p>}
    <div className={subtitulo ? '' : 'mt-4'}>{children}</div>
  </section>
)

const Lista = ({ itens, titulo, cor }) => (
  <div className="cartao p-4">
    <h3 className="rotulo mb-3">{titulo}</h3>
    <ul className="space-y-3">
      {(itens ?? []).map((x, i) => (
        <li key={i} className="border-l-2 pl-3" style={{ borderColor: cor }}>
          <strong className="text-sm">{x.titulo}</strong>
          <p className="mt-0.5 text-sm leading-relaxed text-grafia">{x.texto}</p>
        </li>
      ))}
    </ul>
  </div>
)

// Força da tradição em cada país, em cinco degraus visuais.
const NIVEIS = { 'muito alta': 5, 'alta': 4, 'média-alta': 3, 'em disputa': 3, 'ambígua': 2,
                 'média': 3, 'média-baixa': 2, 'baixa': 1, 'muito baixa': 1, 'quase nula': 0 }

const Forca = ({ nivel, cor }) => {
  const n = NIVEIS[nivel] ?? 2
  return (
    <span className="flex shrink-0 items-center gap-1" title={nivel}>
      {[0, 1, 2, 3, 4].map(i => (
        <span key={i} className="h-1.5 w-4 rounded-full"
              style={{ background: i < n ? cor : '#dcd7cc' }} />
      ))}
    </span>
  )
}

function Eixo({ meta, valor, confianca, cor }) {
  const pct = ((valor + 1) / 2) * 100
  const fraca = confianca < 0.5
  return (
    <div className="py-4">
      <div className="mb-2 flex items-baseline justify-between">
        <span className="text-sm font-medium">{meta?.nome}</span>
        <span className="text-sm tabular-nums text-grafia">{valor > 0 ? '+' : ''}{valor.toFixed(2)}</span>
      </div>
      <div className="relative h-2 rounded-full bg-borda">
        <div className="absolute inset-y-0 left-1/2 w-px bg-white/70" />
        <div className="absolute inset-y-0 rounded-full"
             style={{ background: fraca ? '#b9b4a9' : cor,
                      ...(valor >= 0 ? { left: '50%', width: `${Math.max(pct - 50, 1)}%` }
                                     : { right: '50%', width: `${Math.max(50 - pct, 1)}%` }) }} />
      </div>
      <div className="mt-1.5 flex justify-between text-[11px] text-grafia">
        <span>{meta?.neg}</span>
        {fraca && <span className="italic">medida fraca</span>}
        <span>{meta?.pos}</span>
      </div>
    </div>
  )
}
