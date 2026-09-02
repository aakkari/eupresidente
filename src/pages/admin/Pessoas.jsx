import { useEffect, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { adminPessoas } from '../../lib/api.js'

// Quem se cadastrou, e o que cada um respondeu.
export default function Pessoas() {
  const { token } = useOutletContext()
  const [lista, setLista] = useState(null)
  const [busca, setBusca] = useState('')
  const [aberta, setAberta] = useState(null)
  const [erro, setErro] = useState(null)

  useEffect(() => {
    adminPessoas(token).then(d => setLista(d.pessoas)).catch(e => setErro(e.message))
  }, [token])

  if (erro) return <p className="text-sm text-red-700">{erro}</p>
  if (!lista) return <p className="text-grafia">Carregando...</p>

  const q = busca.trim().toLowerCase()
  const filtradas = q
    ? lista.filter(p => [p.email, p.nome, p.familia, p.uf, p.cidade, p.ocupacao]
        .some(v => String(v ?? '').toLowerCase().includes(q)))
    : lista

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="subtitulo text-2xl">Pessoas</h2>
          <p className="mt-1 text-sm text-grafia">
            {lista.length} {lista.length === 1 ? 'conta' : 'contas'}
            {' · '}{lista.filter(p => p.questionarios > 0).length} responderam
            {' · '}{lista.filter(p => p.assinante).length} assinando
            {' · '}{(lista.reduce((s, p) => s + (p.pago_centavos ?? 0), 0) / 100)
              .toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} recebido
            {lista.some(p => p.mensagens_abertas > 0) &&
              ` · ${lista.filter(p => p.mensagens_abertas > 0).length} com mensagem aberta`}
          </p>
        </div>
        <input className="campo w-64" value={busca} placeholder="buscar por email, nome, família..."
               onChange={e => setBusca(e.target.value)} />
      </div>

      <div className="cartao divide-y divide-borda">
        {filtradas.map(p => (
          <div key={p.id}>
            <button onClick={() => setAberta(a => a === p.id ? null : p.id)}
                    className="flex w-full flex-wrap items-center gap-3 p-4 text-left transition hover:bg-papel">
              <span className="w-10 shrink-0 text-lg font-semibold tabular-nums tracking-apertado">
                {p.posicao ?? '—'}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium">{p.nome || p.email}</span>
                <span className="block truncate text-xs text-grafia">
                  {p.nome && `${p.email} · `}
                  {p.familia ?? 'sem resultado'}
                  {p.uf && ` · ${p.cidade ? `${p.cidade}/` : ''}${p.uf}`}
                </span>
              </span>
              <span className="shrink-0 text-xs tabular-nums text-grafia">
                {p.questionarios} {p.questionarios === 1 ? 'resposta' : 'respostas'}
              </span>
              {p.comunidades > 0 && (
                <span className="shrink-0 text-xs text-tenue">
                  {p.comunidades} {p.comunidades === 1 ? 'comunidade' : 'comunidades'}
                </span>
              )}
              {p.pago_centavos > 0 && (
                <span className="shrink-0 text-xs tabular-nums text-grafia">
                  {(p.pago_centavos / 100).toLocaleString('pt-BR',
                    { style: 'currency', currency: 'BRL' })}
                </span>
              )}
              {p.mensagens_abertas > 0 && (
                <span className="shrink-0 rounded border border-tinta px-1.5 py-0.5 text-[10px]"
                      title="mensagens de contato sem resposta">
                  {p.mensagens_abertas} aberta{p.mensagens_abertas > 1 ? 's' : ''}
                </span>
              )}
              {p.assinante && <span className="shrink-0 rounded bg-tinta px-2 py-0.5 text-[10px] text-papel">assina</span>}
              {!p.confirmada && <span className="shrink-0 text-[10px] text-grafia">não confirmou email</span>}
              <span className="w-20 shrink-0 text-right text-xs text-tenue">
                {new Date(p.criada_em).toLocaleDateString('pt-BR')}
              </span>
            </button>
            {aberta === p.id && <Detalhe token={token} id={p.id} />}
          </div>
        ))}
        {!filtradas.length && <p className="p-4 text-sm text-grafia">Nada encontrado.</p>}
      </div>
    </div>
  )
}

function Detalhe({ token, id }) {
  const [dados, setDados] = useState(null)
  const [erro, setErro] = useState(null)

  useEffect(() => {
    adminPessoas(token, id).then(setDados).catch(e => setErro(e.message))
  }, [token, id])

  if (erro) return <p className="border-t border-borda bg-papel p-4 text-sm text-red-700">{erro}</p>
  if (!dados) return <p className="border-t border-borda bg-papel p-4 text-sm text-grafia">Carregando...</p>

  const { pessoa, questionarios } = dados
  const perfil = pessoa.perfil ?? {}

  return (
    <div className="space-y-5 border-t border-borda bg-papel p-5">
      <div className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-3">
        <Campo r="E-mail" v={pessoa.email} />
        <Campo r="Nome" v={perfil.full_name} />
        <Campo r="Apelido" v={perfil.display_name} />
        <Campo r="Telefone" v={perfil.phone} />
        <Campo r="Nascimento" v={perfil.birth_year} />
        <Campo r="Cidade / UF" v={[perfil.city, perfil.uf].filter(Boolean).join(' / ')} />
        <Campo r="Escolaridade" v={perfil.education} />
        <Campo r="Ocupação" v={perfil.occupation} />
        <Campo r="Último acesso" v={pessoa.ultimo_acesso &&
          new Date(pessoa.ultimo_acesso).toLocaleString('pt-BR')} />
      </div>

      {pessoa.assinatura && pessoa.assinatura.status !== 'nenhuma' && (
        <p className="text-sm">
          <strong>Assinatura:</strong> {pessoa.assinatura.status}
          {pessoa.assinatura.period_end &&
            ` até ${new Date(pessoa.assinatura.period_end).toLocaleDateString('pt-BR')}`}
          {pessoa.assinatura.gateway && ` · ${pessoa.assinatura.gateway}`}
        </p>
      )}

      {pessoa.pagamentos?.length > 0 && (
        <div>
          <p className="rotulo mb-2">Pagamentos</p>
          <div className="cartao divide-y divide-borda">
            {pessoa.pagamentos.map((p, i) => (
              <div key={i} className="flex flex-wrap items-baseline gap-x-3 p-3 text-sm">
                <span className="w-24 shrink-0 tabular-nums">
                  {new Date(p.paid_at ?? p.created_at).toLocaleDateString('pt-BR')}
                </span>
                <span className="w-24 shrink-0 tabular-nums">
                  {(p.amount_cents / 100).toLocaleString('pt-BR',
                    { style: 'currency', currency: p.currency || 'BRL' })}
                </span>
                <span className="flex-1 text-grafia">
                  {p.method === 'cortesia' ? 'cortesia' : p.method || '—'} · {p.status}
                  {p.gateway && ` · ${p.gateway}`}
                </span>
                {p.receipt_url && (
                  <a href={p.receipt_url} target="_blank" rel="noopener noreferrer"
                     className="text-xs underline">recibo</a>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {pessoa.comunidades?.length > 0 && (
        <div>
          <p className="rotulo mb-2">Comunidades</p>
          <div className="cartao divide-y divide-borda">
            {pessoa.comunidades.map((c, i) => (
              <div key={i} className="flex flex-wrap items-baseline gap-x-3 p-3 text-sm">
                <span className="min-w-0 flex-1 truncate">{c.nome}</span>
                {c.dono && <span className="shrink-0 text-xs text-grafia">criou</span>}
                {!c.aparece_no_mapa && (
                  <span className="shrink-0 text-xs text-tenue">fora do mapa</span>
                )}
                <span className="shrink-0 text-xs text-tenue">
                  desde {new Date(c.desde).toLocaleDateString('pt-BR')}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {pessoa.mensagens?.length > 0 && (
        <div>
          {/* Reclamacao e contato aparecem junto do resto: a pessoa que escreveu
              "discordo do meu resultado" e a mesma cujo vetor esta logo abaixo,
              e ler as duas coisas em telas separadas perde o que importa. */}
          <p className="rotulo mb-2">Mensagens que mandou</p>
          <div className="cartao divide-y divide-borda">
            {pessoa.mensagens.map(m => (
              <div key={m.id} className="p-3.5 text-sm">
                <div className="flex flex-wrap items-baseline gap-x-3">
                  {m.subject && <strong>{m.subject}</strong>}
                  <span className="text-xs text-tenue">{m.status}</span>
                  <span className="ml-auto text-xs text-tenue">
                    {new Date(m.created_at).toLocaleDateString('pt-BR')}
                  </span>
                </div>
                <p className="mt-1 whitespace-pre-wrap leading-relaxed text-grafia">{m.message}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <p className="rotulo mb-2">Questionários</p>
        {!questionarios.length && <p className="text-sm text-grafia">Nenhum ainda.</p>}
        <div className="space-y-2">
          {questionarios.map(q => (
            <div key={q.token} className="cartao p-4">
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <span className="text-lg font-semibold tabular-nums">{q.posicao?.posicao ?? '—'}</span>
                <strong className="text-sm">{q.familia ?? q.status}</strong>
                <span className="text-xs text-grafia">
                  {q.posicao?.rotulo} · versão {q.mode === 'short' ? 'rápida' : 'completa'}
                  {' · '}{q.respondidas} respostas
                  {q.duracao_s != null && ` · ${formatarDuracao(q.duracao_s)}`}
                  {' · '}{q.terminado
                    ? new Date(q.terminado).toLocaleString('pt-BR')
                    : `iniciado ${new Date(q.iniciado).toLocaleString('pt-BR')}`}
                </span>
                <a href={`/resultado?token=${q.token}`} target="_blank" rel="noopener noreferrer"
                   className="ml-auto text-xs underline">abrir report</a>
              </div>

              {q.vector && (
                <div className="mt-3 grid gap-x-5 gap-y-1 text-xs sm:grid-cols-3">
                  {Object.entries(q.vector).map(([e, v]) => (
                    <span key={e} className="flex justify-between gap-2 tabular-nums">
                      <span className="text-grafia">{e}</span>
                      <span>{Number(v) > 0 ? '+' : ''}{Number(v).toFixed(2)}
                        {q.confidence?.[e] != null &&
                          <span className="text-tenue"> (conf. {Number(q.confidence[e]).toFixed(2)})</span>}
                      </span>
                    </span>
                  ))}
                </div>
              )}

              {(q.quality_flags?.length > 0 || q.research_eligible === false) && (
                <p className="mt-2 text-xs text-grafia">
                  {q.quality_flags?.length > 0 && <>Marcas: {q.quality_flags.join(', ')}. </>}
                  {q.research_eligible === false && 'Fora da base de pesquisa.'}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

const Campo = ({ r, v }) => (
  <div>
    <span className="rotulo">{r}</span>
    <div className="mt-0.5">{v || <span className="text-tenue">—</span>}</div>
  </div>
)

export function formatarDuracao(s) {
  if (s == null) return '—'
  const m = Math.floor(s / 60)
  return m ? `${m}min${String(s % 60).padStart(2, '0')}s` : `${s}s`
}
