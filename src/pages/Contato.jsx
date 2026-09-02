import { useState } from 'react'
import { useAuth } from '../lib/useAuth.js'
import { enviarContato } from '../lib/api.js'

export default function Contato() {
  const { token } = useAuth()
  const [f, setF] = useState({ nome: '', email: '', assunto: '', mensagem: '' })
  const [estado, setEstado] = useState(null)
  const [erro, setErro] = useState(null)

  const set = (k) => (e) => setF(x => ({ ...x, [k]: e.target.value }))

  async function enviar(e) {
    e.preventDefault()
    setEstado('enviando'); setErro(null)
    try { await enviarContato(f, token); setEstado('enviado') }
    catch (e2) { setEstado(null); setErro(e2.message) }
  }

  if (estado === 'enviado') return (
    <div className="mx-auto max-w-lg px-6 py-20">
      <h1 className="titulo text-3xl">Chegou.</h1>
      <p className="mt-3 leading-relaxed text-grafia">
        Respondo no e-mail que você deixou. Se for sobre um resultado específico, manda o
        link dele junto que fica mais fácil.
      </p>
    </div>
  )

  return (
    <form onSubmit={enviar} className="mx-auto max-w-lg px-6 py-16">
      <h1 className="titulo text-3xl">Fale comigo</h1>
      <p className="mt-2 leading-relaxed text-grafia">
        Dúvida, erro no resultado, imprensa, ou discordância sobre o método — tudo cabe aqui.
      </p>

      <div className="mt-8 space-y-4">
        <Campo r="Seu nome" v={f.nome} onChange={set('nome')} required />
        <Campo r="Seu e-mail" v={f.email} onChange={set('email')} type="email" required />
        <Campo r="Assunto" v={f.assunto} onChange={set('assunto')} />
        <div>
          <label className="rotulo">Mensagem</label>
          <textarea className="campo mt-1.5 min-h-[160px]" value={f.mensagem} required
                    onChange={set('mensagem')} />
        </div>
      </div>

      {erro && <p className="mt-3 text-sm text-red-700">{erro}</p>}

      <button className="botao-forte mt-6" disabled={estado === 'enviando'}>
        {estado === 'enviando' ? 'Enviando...' : 'Enviar'}
      </button>

      <p className="mt-4 text-xs leading-relaxed text-tenue">
        Guardamos o que você escrever e o seu e-mail para responder, e mais nada. Sua
        mensagem não entra na base de pesquisa.
      </p>
    </form>
  )
}

const Campo = ({ r, v, onChange, type = 'text', required }) => (
  <div>
    <label className="rotulo">{r}</label>
    <input className="campo mt-1.5" value={v} type={type} required={required} onChange={onChange} />
  </div>
)
