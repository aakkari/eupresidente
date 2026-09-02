import { useEffect, useState } from 'react'
import { useOutletContext } from 'react-router-dom'

const base = '/.netlify/functions'

async function chamar(token, metodo, corpo) {
  const r = await fetch(`${base}/admin-assinantes`, {
    method: metodo,
    headers: { authorization: `Bearer ${token}`, ...(corpo ? { 'content-type': 'application/json' } : {}) },
    ...(corpo ? { body: JSON.stringify(corpo) } : {}),
  })
  const d = await r.json().catch(() => ({}))
  if (!r.ok) throw new Error(d.erro || `admin-assinantes respondeu ${r.status}`)
  return d
}

// Conceder e tirar assinatura na mao.
//
// Isto nao e um provisorio ate o gateway chegar: cortesia para imprensa, teste
// interno e reembolso vao continuar precisando desta tela depois. O que muda
// com o gateway e de onde vem a maioria das linhas.
export default function Assinantes() {
  const { token } = useOutletContext()
  const [lista, setLista] = useState(null)
  const [email, setEmail] = useState('')
  const [meses, setMeses] = useState(12)
  const [erro, setErro] = useState(null)
  const [ocupado, setOcupado] = useState(false)

  const recarregar = () => chamar(token, 'GET').then(d => setLista(d.assinantes)).catch(e => setErro(e.message))
  useEffect(() => { recarregar() }, [token])

  async function conceder(e) {
    e.preventDefault()
    setOcupado(true); setErro(null)
    try { await chamar(token, 'POST', { email, meses: Number(meses) }); setEmail(''); await recarregar() }
    catch (e2) { setErro(e2.message) }
    setOcupado(false)
  }

  async function tirar(alvo) {
    setOcupado(true); setErro(null)
    try { await chamar(token, 'DELETE', { email: alvo }); await recarregar() }
    catch (e2) { setErro(e2.message) }
    setOcupado(false)
  }

  return (
    <div className="space-y-8">
      <section>
        <h2 className="subtitulo text-2xl">Liberar assinatura</h2>
        <form onSubmit={conceder} className="cartao mt-4 flex flex-wrap items-end gap-3 p-5">
          <div className="min-w-[220px] flex-1">
            <label className="rotulo">Email da conta</label>
            <input className="campo mt-1.5" value={email} type="email" required
                   placeholder="pessoa@exemplo.com" onChange={e => setEmail(e.target.value)} />
          </div>
          <div className="w-28">
            <label className="rotulo">Meses</label>
            <input className="campo mt-1.5" value={meses} inputMode="numeric"
                   onChange={e => setMeses(e.target.value)} />
          </div>
          <button className="botao-forte" disabled={ocupado}>
            {ocupado ? 'Liberando...' : 'Liberar'}
          </button>
        </form>
        <p className="mt-2 text-xs text-grafia">
          A conta precisa existir — a pessoa se cadastra primeiro, você libera depois.
        </p>
        {erro && <p className="mt-2 text-sm text-red-700">{erro}</p>}
      </section>

      <section>
        <h2 className="subtitulo text-2xl">Assinantes</h2>
        {lista === null && <p className="mt-4 text-grafia">Carregando...</p>}
        {lista?.length === 0 && <p className="mt-4 text-sm text-grafia">Ninguém ainda.</p>}
        {lista?.length > 0 && (
          <div className="cartao mt-4 divide-y divide-borda">
            {lista.map(a => (
              <div key={a.user_id} className="flex flex-wrap items-center gap-3 p-4 text-sm">
                <div className="min-w-0 flex-1">
                  <div className="font-medium">{a.nome || a.email || a.user_id}</div>
                  {a.nome && a.email && <div className="text-xs text-grafia">{a.email}</div>}
                </div>
                <span className="w-28 shrink-0 text-xs text-grafia">{a.gateway ?? '—'}</span>
                <span className="w-32 shrink-0 text-xs">
                  {a.vigente ? 'vigente' : 'sem acesso'}
                  {a.period_end && (
                    <span className="block text-grafia">
                      até {new Date(a.period_end).toLocaleDateString('pt-BR')}
                    </span>
                  )}
                </span>
                {a.vigente && a.email && (
                  <button onClick={() => tirar(a.email)} disabled={ocupado}
                          className="botao-leve shrink-0 text-xs">Encerrar</button>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
