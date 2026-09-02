import { useEffect, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { adminConfig, adminSalvarConfig } from '../../lib/api.js'

// Preco e fronteira do que e pago.
//
// Os dois vivem no banco, nao no codigo: e voce que muda, na tela, sem deploy.
// A lista de blocos vem do servidor pelo mesmo motivo — se um bloco nascer ou
// morrer la, esta tela acompanha sozinha em vez de mentir.
const NOMES = { todos: 'Todo mundo', cadastrado: 'Quem tem conta', assinante: 'Quem assina' }

export default function Plano() {
  const { token } = useOutletContext()
  const [cfg, setCfg] = useState(null)
  const [erro, setErro] = useState(null)
  const [estado, setEstado] = useState(null)

  useEffect(() => { adminConfig(token).then(setCfg).catch(e => setErro(e.message)) }, [token])

  if (erro) return <p className="text-sm text-red-700">{erro}</p>
  if (!cfg) return <p className="text-grafia">Carregando...</p>

  const { assinatura, travas, blocos, niveis, gateways, gateways_disponiveis } = cfg
  const set = (k) => (v) => setCfg(c => ({ ...c, assinatura: { ...c.assinatura, [k]: v } }))
  const setTrava = (id, nivel) => setCfg(c => ({ ...c, travas: { ...c.travas, [id]: nivel } }))

  const reais = (assinatura.preco_centavos / 100).toFixed(2).replace('.', ',')

  async function salvar() {
    setEstado('salvando'); setErro(null)
    try {
      await adminSalvarConfig(token, { assinatura, travas })
      setEstado('salvo'); setTimeout(() => setEstado(null), 2500)
    } catch (e) { setEstado(null); setErro(e.message) }
  }

  const podeVender = assinatura.gateway && gateways_disponiveis.includes(assinatura.gateway) &&
                     assinatura.gateway !== 'manual'

  return (
    <div className="space-y-10">
      <section>
        <h2 className="subtitulo text-2xl">Assinatura</h2>
        <div className="cartao mt-4 space-y-5 p-5">
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="rotulo">Preço por {assinatura.ciclo === 'mensal' ? 'mês' : 'ano'}</label>
              <div className="mt-1.5 flex items-center gap-2">
                <span className="text-grafia">R$</span>
                <input className="campo" value={reais} inputMode="decimal"
                       onChange={e => {
                         // Guardamos centavos inteiros. Reais com virgula na
                         // tela e float no banco e como se contabiliza dinheiro
                         // errado desde sempre.
                         const n = Number(String(e.target.value).replace(/\./g, '').replace(',', '.'))
                         set('preco_centavos')(Number.isFinite(n) ? Math.round(n * 100) : 0)
                       }} />
              </div>
            </div>

            <div>
              <label className="rotulo">Ciclo</label>
              <select className="campo mt-1.5" value={assinatura.ciclo}
                      onChange={e => set('ciclo')(e.target.value)}>
                <option value="anual">Anual</option>
                <option value="mensal">Mensal</option>
              </select>
            </div>

            <div>
              <label className="rotulo">Meio de pagamento</label>
              <select className="campo mt-1.5" value={assinatura.gateway ?? ''}
                      onChange={e => set('gateway')(e.target.value || null)}>
                <option value="">— nenhum —</option>
                {gateways.map(g => (
                  <option key={g} value={g}>
                    {g}{gateways_disponiveis.includes(g) ? '' : ' (sem chave)'}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="rotulo">Título</label>
              <input className="campo mt-1.5" value={assinatura.titulo ?? ''}
                     onChange={e => set('titulo')(e.target.value)} />
            </div>
            <div>
              <label className="rotulo">Descrição</label>
              <input className="campo mt-1.5" value={assinatura.descricao ?? ''}
                     onChange={e => set('descricao')(e.target.value)} />
            </div>
          </div>

          <label className="flex items-start gap-2.5 text-sm">
            <input type="checkbox" className="mt-1" checked={Boolean(assinatura.ativa)}
                   onChange={e => set('ativa')(e.target.checked)} />
            <span>
              Assinatura à venda
              {!podeVender && (
                <span className="mt-0.5 block text-xs text-grafia">
                  {/* Ligar sem gateway nao pode abrir a loja: o botao levaria a
                      um erro. A trava paga continua valendo — o que nao existe
                      e o caminho para pagar. */}
                  Sem um meio de pagamento com chave configurada, o botão de assinar não
                  aparece para ninguém. A trava continua valendo, e você pode liberar
                  assinaturas na mão em Assinantes.
                </span>
              )}
            </span>
          </label>
        </div>
      </section>

      <section>
        <h2 className="subtitulo text-2xl">Quem vê cada parte do report</h2>
        <p className="mb-4 mt-1.5 max-w-2xl text-sm leading-relaxed text-grafia">
          Só a análise escrita aparece aqui. Posição, régua, mapa, eixos, facetas e tensões
          ficam sempre abertos: são resposta da própria pessoa, e a LGPD dá a ela direito de
          acesso ao que é dela. Cobrar por isso não é produto, é problema.
        </p>

        <div className="cartao divide-y divide-borda">
          {blocos.map(b => (
            <div key={b.id} className="flex flex-wrap items-center gap-3 p-4">
              <div className="min-w-0 flex-1">
                <div className="font-medium">{b.rotulo}</div>
                <div className="text-xs text-grafia">{b.promessa}</div>
              </div>
              <div className="flex shrink-0 gap-1">
                {niveis.map(n => (
                  <button key={n} onClick={() => setTrava(b.id, n)}
                    className={`rounded px-2.5 py-1 text-xs transition ${
                      travas[b.id] === n
                        ? 'bg-tinta text-papel'
                        : 'border border-borda text-grafia hover:border-tinta hover:text-tinta'}`}>
                    {NOMES[n]}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="flex items-center gap-3 border-t border-borda pt-6">
        <button onClick={salvar} disabled={estado === 'salvando'} className="botao-forte">
          {estado === 'salvando' ? 'Salvando...' : 'Salvar'}
        </button>
        {estado === 'salvo' && <span className="text-sm text-grafia">Salvo.</span>}
        {erro && <span className="text-sm text-red-700">{erro}</span>}
      </div>
    </div>
  )
}
