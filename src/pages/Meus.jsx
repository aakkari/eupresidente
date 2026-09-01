import { useEffect, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useAuth } from '../lib/useAuth.js'
import { meusResultados } from '../lib/api.js'

export default function Meus() {
  const { token, carregando, email, sair } = useAuth()
  const [lista, setLista] = useState(null)
  const [erro, setErro] = useState(null)

  useEffect(() => {
    if (!token) return
    meusResultados(token).then(d => setLista(d.resultados)).catch(e => setErro(e.message))
  }, [token])

  if (carregando) return <p className="mx-auto max-w-2xl px-6 py-20 text-grafia">Carregando...</p>
  if (!token) return <Navigate to="/entrar" replace />

  return (
    <div className="mx-auto max-w-2xl px-6 py-12">
      <div className="mb-8 flex items-baseline justify-between">
        <h1 className="font-serif text-3xl">Seus resultados</h1>
        <button onClick={sair} className="text-xs text-grafia hover:text-tinta">sair</button>
      </div>
      <p className="mb-6 text-sm text-grafia">{email}</p>

      {erro && <p className="text-sm text-red-700">{erro}</p>}
      {lista === null && !erro && <p className="text-grafia">Carregando...</p>}

      {lista?.length === 0 && (
        <div className="cartao p-6">
          <p className="text-sm leading-relaxed text-grafia">
            Você ainda não guardou nenhum resultado. Responda o questionário e, na tela final,
            escolha guardar na sua conta.
          </p>
          <Link to="/" className="botao-forte mt-4 inline-flex">Responder agora</Link>
        </div>
      )}

      <div className="space-y-2">
        {(lista ?? []).map(r => (
          <Link key={r.token} to={`/resultado?token=${r.token}`}
                className="cartao flex items-center gap-4 p-4 transition hover:border-tinta">
            <div className="h-10 w-1.5 shrink-0 rounded" style={{ background: r.cor }} />
            <div className="min-w-0 flex-1">
              <div className="font-medium">{r.familia}</div>
              <div className="text-xs text-grafia">
                versão {r.mode === 'short' ? 'curta' : 'completa'} ·{' '}
                {new Date(r.quando).toLocaleDateString('pt-BR')}
              </div>
            </div>
            <span className="text-xs text-grafia">ver →</span>
          </Link>
        ))}
      </div>

      {lista?.length > 1 && (
        <p className="mt-6 text-xs leading-relaxed text-grafia">
          Mais de um resultado guardado: comparar duas respostas suas em datas diferentes é a
          forma mais honesta de ver se você mudou — ou se o instrumento é instável.
        </p>
      )}
    </div>
  )
}
