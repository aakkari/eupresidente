import { useEffect, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { adminContato, adminMarcarContato } from '../../lib/api.js'

const FILTROS = [['novo', 'Novas'], ['lido', 'Lidas'], ['respondido', 'Respondidas'],
                 ['arquivado', 'Arquivadas'], ['todos', 'Todas']]

export default function Contato() {
  const { token } = useOutletContext()
  const [filtro, setFiltro] = useState('novo')
  const [d, setD] = useState(null)
  const [erro, setErro] = useState(null)

  const recarregar = (f = filtro) => adminContato(token, f).then(setD).catch(e => setErro(e.message))
  useEffect(() => { recarregar(filtro) }, [token, filtro])

  async function marcar(id, status) {
    await adminMarcarContato(token, id, status)
    await recarregar()
  }

  if (erro) return <p className="text-sm text-red-700">{erro}</p>

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="subtitulo text-2xl">Contato</h2>
          <p className="mt-1 text-sm text-grafia">
            {d?.novas ?? 0} {d?.novas === 1 ? 'mensagem nova' : 'mensagens novas'}
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {FILTROS.map(([id, rotulo]) => (
            <button key={id} onClick={() => setFiltro(id)}
              className={`rounded-md px-3 py-1.5 text-xs transition ${
                id === filtro ? 'bg-tinta text-papel' : 'border border-borda bg-white hover:border-tinta'}`}>
              {rotulo}
            </button>
          ))}
        </div>
      </div>

      {!d && <p className="text-grafia">Carregando...</p>}
      {d && !d.mensagens.length && <p className="text-grafia">Nada aqui.</p>}

      <div className="space-y-3">
        {(d?.mensagens ?? []).map(m => (
          <article key={m.id} className="cartao p-5">
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <strong className="text-sm">{m.name}</strong>
              <a href={`mailto:${m.email}?subject=${encodeURIComponent(`Re: ${m.subject || 'seu contato no Eu Presidente'}`)}`}
                 className="text-sm underline">{m.email}</a>
              {m.user_id && <span className="rounded bg-tinta px-2 py-0.5 text-[10px] text-papel">tem conta</span>}
              <span className="ml-auto text-xs text-tenue">
                {new Date(m.created_at).toLocaleString('pt-BR')}
              </span>
            </div>

            {m.subject && <p className="mt-2 text-sm font-medium">{m.subject}</p>}
            <p className="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed text-grafia">
              {m.message}
            </p>

            <div className="mt-4 flex flex-wrap gap-1.5">
              {['lido', 'respondido', 'arquivado'].map(s => (
                <button key={s} onClick={() => marcar(m.id, s)}
                  className={`rounded-md px-3 py-1.5 text-xs transition ${
                    m.status === s ? 'bg-tinta text-papel' : 'border border-borda hover:border-tinta'}`}>
                  {s === 'lido' ? 'Lida' : s === 'respondido' ? 'Respondida' : 'Arquivar'}
                </button>
              ))}
            </div>
          </article>
        ))}
      </div>
    </div>
  )
}
