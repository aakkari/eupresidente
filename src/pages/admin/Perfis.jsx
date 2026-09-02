import { useEffect, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { adminPerfis, adminSalvarPerfil } from '../../lib/api.js'

// O quadro dos resultados possíveis, com o raciocínio técnico de cada um e o
// conteúdo editável.
//
// O centróide aparece, e não se edita. É a diferença entre corrigir um texto e
// reclassificar em silêncio todo mundo que já respondeu.
const TEXTOS = [
  ['name', 'Nome'], ['tagline', 'Linha de chamada'],
  ['description', 'O que isso quer dizer'], ['history', 'De onde vem'],
  ['blind_spots', 'O ponto cego'],
]
const LISTAS = [
  ['schools', 'Escolas / correntes'], ['curiosities', 'Curiosidades'],
  ['figures', 'Figuras históricas'], ['strengths', 'Forças'],
  ['weaknesses', 'Fraquezas'], ['countries', 'Países'],
]

export default function Perfis() {
  const { token } = useOutletContext()
  const [d, setD] = useState(null)
  const [erro, setErro] = useState(null)
  const [aberto, setAberto] = useState(null)

  const recarregar = () => adminPerfis(token).then(setD).catch(e => setErro(e.message))
  useEffect(() => { recarregar() }, [token])

  if (erro) return <p className="text-sm text-red-700">{erro}</p>
  if (!d) return <p className="text-grafia">Carregando...</p>

  return (
    <div className="space-y-8">
      <div>
        <h2 className="subtitulo text-2xl">Perfis possíveis</h2>
        <p className="mt-1 max-w-3xl text-sm leading-relaxed text-grafia">
          Os {d.perfis.length} resultados que o instrumento pode dar, o que define cada um e
          quanta gente caiu ali. O texto se edita aqui.{' '}
          <strong className="text-tinta">O centróide não</strong> — ele é a medida, e mexer
          nele reclassifica silenciosamente todo mundo que já respondeu, inclusive o report
          que a pessoa já mandou para os amigos.
        </p>
      </div>

      {d.pares_proximos?.length > 0 && (
        <section>
          <h3 className="rotulo mb-2">Perfis que o instrumento quase não separa</h3>
          <p className="mb-3 max-w-3xl text-sm leading-relaxed text-grafia">
            Centróides colados significam que a diferença entre as duas tradições não está
            sendo perguntada. É aqui que vale investir pergunta nova — e o eixo indicado é
            onde ela decidiria.
          </p>
          <div className="cartao divide-y divide-borda">
            {d.pares_proximos.slice(0, 5).map((p, i) => (
              <div key={i} className="flex flex-wrap items-center gap-x-3 gap-y-1 p-3 text-sm">
                <span className="min-w-0 flex-1">{p.a} <span className="text-tenue">×</span> {p.b}</span>
                <span className="shrink-0 text-xs text-grafia">
                  separa melhor em <strong className="text-tinta">{p.separa.eixo}</strong>
                  {' '}({p.separa.delta})
                </span>
                <span className="w-14 shrink-0 text-right tabular-nums">{p.d}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="cartao divide-y divide-borda">
        {d.perfis.map(p => (
          <div key={p.id}>
            <button onClick={() => setAberto(a => a === p.id ? null : p.id)}
                    className="flex w-full flex-wrap items-center gap-3 p-4 text-left transition hover:bg-papel">
              <span className="min-w-0 flex-1">
                <span className="block font-medium">{p.name}</span>
                <span className="block truncate text-xs text-grafia">{p.tagline}</span>
              </span>
              <span className="shrink-0 text-xs text-grafia">
                {p.tecnico.define.map(e => `${e.eixo} ${e.valor > 0 ? '+' : ''}${e.valor}`).join(' · ')}
              </span>
              {p.falta.length > 0 && (
                <span className="shrink-0 rounded border border-borda px-2 py-0.5 text-[10px] text-grafia">
                  falta {p.falta.length}
                </span>
              )}
              <span className="w-16 shrink-0 text-right text-xs tabular-nums text-tenue">
                {p.pessoas} {p.pessoas === 1 ? 'pessoa' : 'pessoas'}
              </span>
            </button>
            {aberto === p.id && (
              <Editor perfil={p} eixos={d.eixos} token={token} aoSalvar={recarregar} />
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function Editor({ perfil, eixos, token, aoSalvar }) {
  const [campos, setCampos] = useState({})
  const [estado, setEstado] = useState(null)
  const [erro, setErro] = useState(null)

  useEffect(() => {
    const c = {}
    for (const [k] of TEXTOS) c[k] = perfil[k] ?? ''
    for (const [k] of LISTAS) c[k] = JSON.stringify(perfil[k] ?? [], null, 2)
    setCampos(c)
  }, [perfil.id])

  async function salvar() {
    setEstado('salvando'); setErro(null)
    const corpo = { id: perfil.id }
    for (const [k] of TEXTOS) corpo[k] = campos[k]
    for (const [k] of LISTAS) {
      try { corpo[k] = JSON.parse(campos[k] || '[]') }
      catch { setEstado(null); return setErro(`${k}: JSON inválido`) }
    }
    try {
      await adminSalvarPerfil(token, corpo)
      setEstado('salvo'); setTimeout(() => setEstado(null), 2500)
      await aoSalvar()
    } catch (e) { setEstado(null); setErro(e.message) }
  }

  const t = perfil.tecnico

  return (
    <div className="space-y-6 border-t border-borda bg-papel p-5">
      {/* A argumentacao tecnica: por que alguem cai aqui, e de quem isso e
          vizinho. E o que permite melhorar o conteudo sabendo do que se fala. */}
      <section className="cartao p-4">
        <p className="rotulo mb-3">Por que alguém cai aqui</p>

        <div className="space-y-1.5 text-sm">
          {t.define.map(e => (
            <div key={e.eixo} className="flex items-center gap-3">
              <span className="w-44 shrink-0 truncate text-grafia">
                {eixos[e.eixo]?.nome ?? e.eixo}
              </span>
              <div className="relative h-2 flex-1 rounded-full bg-borda">
                <div className="absolute inset-y-0 left-1/2 w-px bg-white/70" />
                <div className="absolute inset-y-0 rounded-full bg-tinta"
                     style={e.valor >= 0
                       ? { left: '50%', width: `${(e.valor / 2) * 100}%` }
                       : { right: '50%', width: `${(-e.valor / 2) * 100}%` }} />
              </div>
              <span className="w-12 shrink-0 text-right tabular-nums">
                {e.valor > 0 ? '+' : ''}{e.valor}
              </span>
              <span className="w-40 shrink-0 truncate text-xs text-tenue">
                {e.valor >= 0 ? eixos[e.eixo]?.pos : eixos[e.eixo]?.neg}
              </span>
            </div>
          ))}
        </div>

        {t.indiferente.length > 0 && (
          <p className="mt-3 text-xs leading-relaxed text-grafia">
            Indiferente em <strong className="text-tinta">{t.indiferente.join(', ')}</strong> —
            esses eixos não dizem nada sobre este perfil, e responder de qualquer jeito neles
            não tira ninguém daqui.
          </p>
        )}

        <div className="mt-4 border-t border-borda pt-3">
          <p className="rotulo mb-2">Vizinhos mais próximos</p>
          {t.vizinhos.map(v => (
            <p key={v.id} className="text-xs leading-relaxed text-grafia">
              <strong className="text-tinta">{v.nome}</strong> a {v.d} — o que mais separa os
              dois é <strong className="text-tinta">{v.separa.eixo}</strong> ({v.separa.delta.toFixed(2)})
            </p>
          ))}
        </div>

        <p className="mt-4 text-xs text-tenue">
          Centróide: {Object.entries(perfil.centroid ?? {}).map(([e, v]) => `${e} ${v}`).join(' · ')}
          {' — '}somente leitura.
        </p>
        <p className="mt-1 text-xs text-tenue">
          {perfil.pessoas} {perfil.pessoas === 1 ? 'pessoa caiu' : 'pessoas caíram'} aqui
          {perfil.como_segundo > 0 && `, e ${perfil.como_segundo} ficaram perto disso como segunda família`}.
        </p>
      </section>

      {perfil.falta.length > 0 && (
        <p className="text-sm text-grafia">
          Ainda sem conteúdo: <strong className="text-tinta">{perfil.falta.join(', ')}</strong>.
        </p>
      )}

      <div className="space-y-4">
        {TEXTOS.map(([k, rotulo]) => (
          <div key={k}>
            <label className="rotulo">{rotulo}</label>
            {k === 'name' || k === 'tagline' ? (
              <input className="campo mt-1.5" value={campos[k] ?? ''}
                     onChange={e => setCampos(c => ({ ...c, [k]: e.target.value }))} />
            ) : (
              <textarea className="campo mt-1.5 min-h-[110px] font-normal" value={campos[k] ?? ''}
                        onChange={e => setCampos(c => ({ ...c, [k]: e.target.value }))} />
            )}
          </div>
        ))}

        {LISTAS.map(([k, rotulo]) => (
          <div key={k}>
            <label className="rotulo">
              {rotulo}
              <span className="ml-2 font-normal normal-case tracking-normal text-tenue">
                lista em JSON{FORMATOS[k] && ` — cada item precisa de ${FORMATOS[k].join(', ')}`}
              </span>
            </label>
            <textarea className="campo mt-1.5 min-h-[130px] font-mono text-xs"
                      value={campos[k] ?? ''}
                      onChange={e => setCampos(c => ({ ...c, [k]: e.target.value }))} />
          </div>
        ))}
      </div>

      <div className="flex items-center gap-3">
        <button onClick={salvar} disabled={estado === 'salvando'} className="botao-forte">
          {estado === 'salvando' ? 'Salvando...' : 'Salvar conteúdo'}
        </button>
        {estado === 'salvo' && <span className="text-sm text-grafia">Salvo.</span>}
        {erro && <span className="text-sm text-red-700">{erro}</span>}
      </div>
    </div>
  )
}

// Espelha FORMATO no servidor. O servidor e quem recusa; isto so evita que a
// pessoa descubra o formato errando.
const FORMATOS = {
  curiosities: ['titulo', 'texto'],
  figures: ['nome', 'periodo', 'pais', 'nota'],
  strengths: ['titulo', 'texto'],
  weaknesses: ['titulo', 'texto'],
  countries: ['pais', 'forca', 'nota'],
}
