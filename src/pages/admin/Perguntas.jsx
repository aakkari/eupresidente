import { useEffect, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { adminCarregar, adminEditarPergunta, adminPublicar } from '../../lib/api.js'

const EIXOS = ['ECO', 'SOC', 'AUT', 'NAC', 'DEM', 'AMB']

export default function Perguntas() {
  const { token } = useOutletContext()
  const [dados, setDados] = useState(null)
  const [erro, setErro] = useState(null)
  const [salvando, setSalvando] = useState(null)

  const carregar = (id) => adminCarregar(token, id).then(setDados).catch(e => setErro(e.message))
  useEffect(() => { carregar() }, [])

  if (erro) return <p className="text-red-700">{erro}</p>
  if (!dados) return <p className="text-grafia">Carregando...</p>

  const instrumento = dados.instrumentos.find(i => i.id === dados.instrumento_id)
  const travado = instrumento?.active

  async function alterar(id, campos) {
    setSalvando(id); setErro(null)
    try {
      const nova = await adminEditarPergunta(token, { id, ...campos })
      setDados(d => ({ ...d, perguntas: d.perguntas.map(p => p.id === id ? nova : p) }))
    } catch (e) { setErro(e.message) }
    setSalvando(null)
  }

  async function acao(acao, extra = {}) {
    setErro(null)
    try {
      await adminPublicar(token, { instrument_id: dados.instrumento_id, acao, ...extra })
      await carregar(acao === 'clonar' ? extra.novo_id : dados.instrumento_id)
    } catch (e) { setErro(e.message) }
  }

  const porBloco = dados.perguntas.reduce((acc, p) => {
    (acc[p.block] ||= []).push(p); return acc
  }, {})

  return (
    <div>
      <div className="cartao mb-6 flex flex-wrap items-center justify-between gap-3 p-4">
        <div>
          <select className="campo w-auto" value={dados.instrumento_id}
                  onChange={e => carregar(e.target.value)}>
            {dados.instrumentos.map(i => (
              <option key={i.id} value={i.id}>{i.label} {i.active ? '· no ar' : '· rascunho'}</option>
            ))}
          </select>
          <p className="mt-2 text-xs text-grafia">
            {travado
              ? 'Publicado: o texto está travado. Mudar uma pergunta agora faria respostas antigas e novas significarem coisas diferentes sob o mesmo id. Clone em v2 para editar.'
              : `Rascunho: ${dados.perguntas.length} perguntas editáveis.`}
          </p>
        </div>

        <div className="flex gap-2">
          {!travado && (
            <button className="botao-forte" onClick={() => acao('publicar')}>Publicar</button>
          )}
          <button className="botao-leve" onClick={() => {
            const novo_id = prompt('id da nova versão (ex: br-v2)')
            if (novo_id) acao('clonar', { novo_id })
          }}>Clonar em nova versão</button>
        </div>
      </div>

      {erro && <p className="mb-4 text-sm text-red-700">{erro}</p>}

      {Object.entries(porBloco).map(([bloco, perguntas]) => (
        <section key={bloco} className="mb-8">
          <h2 className="rotulo mb-2">{bloco} · {perguntas.length}</h2>
          <div className="space-y-2">
            {perguntas.map(p => (
              <div key={p.id} className="cartao p-4">
                <div className="mb-2 flex items-center gap-2 text-xs text-grafia">
                  <code>{p.id}</code>
                  {salvando === p.id && <span>salvando...</span>}
                </div>

                <textarea className="campo" rows={2} defaultValue={p.body} disabled={travado}
                  onBlur={e => e.target.value !== p.body && alterar(p.id, { body: e.target.value })} />

                <div className="mt-3 flex flex-wrap items-center gap-3 text-xs">
                  <label className="flex items-center gap-1">
                    eixo
                    <select className="campo w-auto py-1" defaultValue={p.axis} disabled={travado}
                      onChange={e => alterar(p.id, { axis: e.target.value })}>
                      {EIXOS.map(x => <option key={x}>{x}</option>)}
                    </select>
                  </label>

                  <label className="flex items-center gap-1">
                    direção
                    <select className="campo w-auto py-1" defaultValue={p.direction} disabled={travado}
                      onChange={e => alterar(p.id, { direction: Number(e.target.value) })}>
                      <option value={1}>+1 direta</option>
                      <option value={-1}>-1 invertida</option>
                    </select>
                  </label>

                  <label className="flex items-center gap-1">
                    peso
                    <input className="campo w-20 py-1" type="number" step="0.1" min="0.1" max="9.9"
                      defaultValue={p.weight} disabled={travado}
                      onBlur={e => Number(e.target.value) !== Number(p.weight)
                        && alterar(p.id, { weight: Number(e.target.value) })} />
                  </label>

                  <label className="flex items-center gap-1">
                    <input type="checkbox" defaultChecked={p.in_short} disabled={travado}
                      onChange={e => alterar(p.id, { in_short: e.target.checked })} />
                    na curta
                  </label>

                  {p.attention_pair && (
                    <span className="rounded bg-papel px-2 py-1">par de atenção: {p.attention_pair}</span>
                  )}
                  {p.secondary_axis && (
                    <span className="rounded bg-papel px-2 py-1">
                      2º eixo: {p.secondary_axis} ({p.secondary_weight})
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
