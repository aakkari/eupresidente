import { useEffect, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useAuth, esquecerNome } from '../lib/useAuth.js'
import {
  meusResultados, meuPerfil, salvarPerfil, apagarResultado,
  minhaAssinatura, assinar, cancelarAssinatura,
} from '../lib/api.js'
import Evolucao from '../components/Evolucao.jsx'
import Compartilhar from '../components/Compartilhar.jsx'

export default function Conta() {
  const { token, carregando, sair } = useAuth()
  const [perfil, setPerfil] = useState(null)
  const [lista, setLista] = useState(null)
  const [conta, setConta] = useState(null)
  const [erro, setErro] = useState(null)

  useEffect(() => {
    if (!token) return
    meuPerfil(token).then(setPerfil).catch(e => setErro(e.message))
    meusResultados(token).then(d => setLista(d.resultados)).catch(e => setErro(e.message))
    minhaAssinatura(token).then(setConta).catch(e => setErro(e.message))
  }, [token])

  if (carregando) return <Aviso>Carregando...</Aviso>
  if (!token) return <Navigate to="/entrar" replace />

  const ultimo = lista?.[0]

  return (
    <div className="mx-auto max-w-4xl px-6 py-12">
      <div className="mb-10 flex items-start justify-between gap-4">
        <div>
          <p className="rotulo">Minha conta</p>
          <h1 className="titulo mt-2 text-4xl">
            {perfil?.full_name || perfil?.display_name || 'Sua conta'}
          </h1>
          <p className="mt-2 text-sm text-grafia">{perfil?.email}</p>
        </div>
        <button onClick={sair} className="botao-leve shrink-0 text-xs">Sair</button>
      </div>

      {erro && <p className="mb-6 text-sm text-red-700">{erro}</p>}

      <div className="mb-10 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Tile n={perfil?.questionarios ?? '—'} r="questionários respondidos" />
        <Tile n={ultimo?.posicao?.posicao ?? '—'} r="posição mais recente" />
        <Tile n={ultimo?.familia ?? '—'} r="família política" pequeno />
        <Tile n={perfil?.desde ? new Date(perfil.desde).toLocaleDateString('pt-BR') : '—'}
              r="conta criada em" pequeno />
      </div>

      <Bloco titulo="Comunidade"
             sub="Um mapa com a sua gente: você convida, cada pessoa aceita, e o grupo inteiro aparece no mesmo gráfico, com nome.">
        <Link to="/comunidade" className="botao-forte inline-flex">Abrir minha comunidade</Link>
      </Bloco>

      <Bloco titulo="Como sua posição mudou"
             sub="Cada ponto é um questionário que você respondeu. A linha só faz sentido com mais de um.">
        <Evolucao resultados={lista ?? []} />
      </Bloco>

      <Bloco titulo="Seus resultados"
             sub="Abra, mande para alguém, gere o card ou apague. Apagar é definitivo.">
        {lista === null && <p className="text-sm text-grafia">Carregando...</p>}
        {lista?.length === 0 && (
          <div className="cartao p-6">
            <p className="text-sm leading-relaxed text-grafia">
              Você ainda não guardou nenhum resultado.
            </p>
            <Link to="/" className="botao-forte mt-4 inline-flex">Responder agora</Link>
          </div>
        )}
        <div className="space-y-2">
          {(lista ?? []).map(r => (
            <Resultado key={r.token} r={r} token={token}
                       aoApagar={() => setLista(l => l.filter(x => x.token !== r.token))} />
          ))}
        </div>
      </Bloco>

      <Assinatura conta={conta} token={token} aoMudar={setConta} />

      <Bloco titulo="Seus dados"
             sub="Cidade, estado, ano de nascimento, escolaridade e ocupação são o que permite comparar seu perfil com o de quem se parece com você. Nunca pedimos CPF ou documento: identificador único somado a opinião política é o pior tipo de base para existir.">
        <FormPerfil token={token} perfil={perfil} aoSalvar={setPerfil} />
      </Bloco>
    </div>
  )
}

// ------------------------------------------------------------------ resultado

function Resultado({ r, token, aoApagar }) {
  const [aberto, setAberto] = useState(false)
  const [confirmando, setConfirmando] = useState(false)
  const [apagando, setApagando] = useState(false)
  const [erro, setErro] = useState(null)

  const link = `${window.location.origin}/resultado?token=${r.token}`

  async function apagar() {
    setApagando(true)
    try { await apagarResultado(token, r.token); aoApagar() }
    catch (e) { setErro(e.message); setApagando(false) }
  }

  return (
    <div className="cartao overflow-hidden">
      {/* flex-wrap e a linha de botoes ocupando a largura toda no celular: em
          390px os tres botoes competiam com o nome da familia e o "Apagar"
          saia para fora do cartao, cortado e sem como clicar. */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-3 p-4">
        <span className="w-12 shrink-0 text-2xl font-semibold tabular-nums tracking-apertado">
          {r.posicao?.posicao ?? '—'}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-medium">{r.familia}</span>
          <span className="block text-xs text-grafia">
            {r.posicao?.rotulo} · versão {r.mode === 'short' ? 'rápida' : 'completa'} ·{' '}
            {new Date(r.quando).toLocaleDateString('pt-BR')}
          </span>
        </span>
        <div className="flex w-full shrink-0 flex-wrap gap-1.5 sm:w-auto sm:justify-end">
          <Link to={`/resultado?token=${r.token}`} className="botao-leve text-xs">Abrir</Link>
          <button onClick={() => setAberto(a => !a)} className="botao-leve text-xs">
            {aberto ? 'Fechar' : 'Enviar / card'}
          </button>
          <button onClick={() => setConfirmando(true)} className="botao-leve text-xs">Apagar</button>
        </div>
      </div>

      {aberto && (
        <div className="border-t border-borda bg-papel p-4">
          <Compartilhar posicao={r.posicao} link={link} compacto
                        familia={{ id: r.token, name: r.familia, tagline: r.tagline, color: r.cor }} />
        </div>
      )}

      {confirmando && (
        <div className="border-t border-borda bg-papel p-4">
          <p className="text-sm font-medium">Apagar este resultado?</p>
          {/* A pessoa merece saber o que sai e o que fica. A linha da pesquisa
              e anonima e nao aponta para a conta — nao existe "a sua" la para
              apagar, e fingir que existe seria mentir para tranquilizar. */}
          <p className="mt-1.5 max-w-xl text-xs leading-relaxed text-grafia">
            Some para sempre: suas respostas, o resultado, o report e o link. Não dá para
            desfazer. O que fica é a linha anônima da base de pesquisa, que não tem ligação
            com a sua conta e por isso não pode ser localizada por pessoa.
          </p>
          {erro && <p className="mt-2 text-xs text-red-700">{erro}</p>}
          <div className="mt-3 flex gap-2">
            <button onClick={apagar} disabled={apagando} className="botao-forte text-xs">
              {apagando ? 'Apagando...' : 'Apagar definitivamente'}
            </button>
            <button onClick={() => setConfirmando(false)} className="botao-leve text-xs">Cancelar</button>
          </div>
        </div>
      )}
    </div>
  )
}

// ----------------------------------------------------------------- assinatura

function Assinatura({ conta, token, aoMudar }) {
  const [ocupado, setOcupado] = useState(false)
  const [erro, setErro] = useState(null)
  const [confirmando, setConfirmando] = useState(false)
  const [avisado, setAvisado] = useState(false)

  if (!conta) return null

  const { assinatura, plano, pagamentos, nivel } = conta
  const assinante = nivel === 'assinante'
  const preco = (plano.preco_centavos / 100)
    .toLocaleString('pt-BR', { style: 'currency', currency: plano.moeda || 'BRL' })

  async function comecar() {
    setOcupado(true); setErro(null)
    try {
      const r = await assinar(token)
      if (r.manual) {
        // Aba nova, e nao troca de pagina: a pessoa volta para ca e encontra a
        // instrucao do que acontece depois, em vez de uma tela em branco.
        window.open(r.url, '_blank', 'noopener')
        setAvisado(true); setOcupado(false)
      } else {
        window.location.href = r.url
      }
    } catch (e) { setErro(e.message); setOcupado(false) }
  }

  async function cancelar() {
    setOcupado(true); setErro(null)
    try {
      await cancelarAssinatura(token)
      const novo = await minhaAssinatura(token)
      aoMudar(novo); setConfirmando(false)
    } catch (e) { setErro(e.message) }
    setOcupado(false)
  }

  return (
    <Bloco titulo="Assinatura" id="assinatura">
      <div className="cartao p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="subtitulo text-xl">{plano.titulo}</h3>
          <span className="text-2xl font-semibold tabular-nums tracking-apertado">
            {preco}<span className="text-sm font-normal text-grafia">/{plano.ciclo === 'mensal' ? 'mês' : 'ano'}</span>
          </span>
        </div>
        {plano.descricao && <p className="mt-1.5 text-sm text-grafia">{plano.descricao}</p>}

        <div className="mt-4 border-t border-borda pt-4">
          {assinante ? (
            <>
              <p className="text-sm">
                <strong>Ativa</strong>
                {assinatura.period_end && (
                  <> até {new Date(assinatura.period_end).toLocaleDateString('pt-BR')}</>
                )}
                {assinatura.cancel_at_period_end && ' — não renova automaticamente.'}
              </p>
              {!assinatura.cancel_at_period_end && (
                confirmando ? (
                  <div className="mt-3">
                    <p className="text-sm">
                      Cancelar a renovação? Você continua com acesso até{' '}
                      {assinatura.period_end
                        ? new Date(assinatura.period_end).toLocaleDateString('pt-BR')
                        : 'o fim do período pago'} — cancelar não é estorno.
                    </p>
                    <div className="mt-3 flex gap-2">
                      <button onClick={cancelar} disabled={ocupado} className="botao-forte text-xs">
                        {ocupado ? 'Cancelando...' : 'Confirmar cancelamento'}
                      </button>
                      <button onClick={() => setConfirmando(false)} className="botao-leve text-xs">
                        Manter
                      </button>
                    </div>
                  </div>
                ) : (
                  <button onClick={() => setConfirmando(true)} className="botao-leve mt-3 text-xs">
                    Cancelar renovação
                  </button>
                )
              )}
            </>
          ) : plano.a_venda ? (
            <>
              <button onClick={comecar} disabled={ocupado} className="botao-forte">
                {ocupado ? 'Abrindo...' : `Assinar por ${preco}`}
              </button>
              {plano.manual && (
                <p className="mt-3 max-w-xl text-sm leading-relaxed text-grafia">
                  {avisado
                    ? 'Abrimos o pagamento numa aba nova. Assim que ele cair, liberamos seu acesso e você recebe um aviso — costuma ser no mesmo dia. Se demorar mais que isso, fale comigo.'
                    : 'O pagamento abre numa página do meio de pagamento. A liberação ainda não é automática: assim que o valor cair, seu acesso é liberado — normalmente no mesmo dia.'}
                </p>
              )}
            </>
          ) : (
            // Nao inventar um botao que leva a erro: enquanto o meio de
            // pagamento nao existe, a tela diz o que e, e nao finge uma loja.
            <p className="text-sm leading-relaxed text-grafia">
              A assinatura ainda não está aberta. Quando abrir, ela vai custar {preco} por{' '}
              {plano.ciclo === 'mensal' ? 'mês' : 'ano'} e liberar a análise escrita completa do
              seu perfil. Sua posição, seu mapa, seus eixos e suas facetas continuam abertos de
              graça — isso é dado seu.
            </p>
          )}
          {erro && <p className="mt-2 text-sm text-red-700">{erro}</p>}
        </div>
      </div>

      {pagamentos?.length > 0 && (
        <div className="cartao mt-3 divide-y divide-borda">
          <p className="rotulo p-4 pb-2">Histórico de pagamentos</p>
          {pagamentos.map((p, i) => (
            <div key={i} className="flex flex-wrap items-baseline gap-x-3 gap-y-1 p-4 text-sm">
              <span className="w-24 shrink-0 tabular-nums">
                {new Date(p.paid_at ?? p.created_at).toLocaleDateString('pt-BR')}
              </span>
              <span className="w-24 shrink-0 tabular-nums">
                {(p.amount_cents / 100).toLocaleString('pt-BR',
                  { style: 'currency', currency: p.currency || 'BRL' })}
              </span>
              <span className="flex-1 text-grafia">
                {p.method === 'cortesia' ? 'cortesia' : p.method || '—'} · {p.status}
              </span>
              {p.receipt_url && (
                <a href={p.receipt_url} target="_blank" rel="noopener noreferrer"
                   className="text-xs underline">recibo</a>
              )}
            </div>
          ))}
        </div>
      )}
    </Bloco>
  )
}

// --------------------------------------------------------------------- perfil

const ESCOLARIDADE = ['Fundamental', 'Médio', 'Superior incompleto', 'Superior',
                      'Pós-graduação', 'Prefiro não dizer']
const UFS = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR',
             'PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO']

function FormPerfil({ token, perfil, aoSalvar }) {
  const [f, setF] = useState({})
  const [estado, setEstado] = useState(null)
  const [erro, setErro] = useState(null)

  useEffect(() => {
    if (!perfil) return
    setF({
      full_name: perfil.full_name ?? '', display_name: perfil.display_name ?? '',
      phone: perfil.phone ?? '', birth_year: perfil.birth_year ?? '',
      city: perfil.city ?? '', uf: perfil.uf ?? '',
      education: perfil.education ?? '', occupation: perfil.occupation ?? '',
    })
  }, [perfil])

  const set = (k) => (v) => setF(x => ({ ...x, [k]: v }))

  async function enviar(e) {
    e.preventDefault()
    setEstado('salvando'); setErro(null)
    const campos = { ...f, birth_year: f.birth_year === '' ? null : Number(f.birth_year) }
    try {
      await salvarPerfil(token, campos)
      aoSalvar(p => ({ ...p, ...campos }))
      // Sem isto o cabecalho fica com o nome antigo ate recarregar a pagina.
      esquecerNome()
      setEstado('salvo'); setTimeout(() => setEstado(null), 2500)
    } catch (e2) { setEstado(null); setErro(e2.message) }
  }

  return (
    <form onSubmit={enviar} className="cartao p-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <Campo rotulo="Nome completo" valor={f.full_name} set={set('full_name')} />
        <Campo rotulo="Como quer ser chamado" valor={f.display_name} set={set('display_name')}
               dica="aparece nos grupos de amigos" />
        <div>
          <label className="rotulo">Email</label>
          <input className="campo mt-1.5 bg-papel text-grafia" value={perfil?.email ?? ''} disabled />
          <p className="mt-1 text-[11px] text-tenue">É sua chave de acesso e não muda por aqui.</p>
        </div>
        <Campo rotulo="Telefone" valor={f.phone} set={set('phone')} placeholder="(11) 90000-0000" />

        <Campo rotulo="Ano de nascimento" valor={f.birth_year} set={set('birth_year')}
               placeholder="1985" inputMode="numeric"
               dica="só o ano: a faixa etária sai igual e identifica menos" />

        <div className="grid grid-cols-[1fr_84px] gap-3">
          <Campo rotulo="Cidade" valor={f.city} set={set('city')} />
          <Selecao rotulo="UF" valor={f.uf} set={set('uf')} opcoes={UFS} />
        </div>

        <Selecao rotulo="Escolaridade" valor={f.education} set={set('education')}
                 opcoes={ESCOLARIDADE} />
        <Campo rotulo="Ocupação" valor={f.occupation} set={set('occupation')}
               placeholder="professora, autônomo, aposentado..." />
      </div>

      <div className="mt-5 flex items-center gap-3">
        <button className="botao-forte" disabled={estado === 'salvando'}>
          {estado === 'salvando' ? 'Salvando...' : 'Salvar'}
        </button>
        {estado === 'salvo' && <span className="text-xs text-grafia">Salvo.</span>}
        {erro && <span className="text-xs text-red-700">{erro}</span>}
      </div>
    </form>
  )
}

const Campo = ({ rotulo, valor, set, placeholder, dica, inputMode }) => (
  <div>
    <label className="rotulo">{rotulo}</label>
    <input className="campo mt-1.5" value={valor ?? ''} placeholder={placeholder}
           inputMode={inputMode} onChange={e => set(e.target.value)} />
    {dica && <p className="mt-1 text-[11px] text-tenue">{dica}</p>}
  </div>
)

const Selecao = ({ rotulo, valor, set, opcoes }) => (
  <div>
    <label className="rotulo">{rotulo}</label>
    <select className="campo mt-1.5" value={valor ?? ''} onChange={e => set(e.target.value)}>
      <option value="">—</option>
      {opcoes.map(o => <option key={o} value={o}>{o}</option>)}
    </select>
  </div>
)

const Bloco = ({ titulo, sub, id, children }) => (
  <section id={id} className="mb-12 scroll-mt-20">
    <h2 className="subtitulo text-2xl">{titulo}</h2>
    {sub && <p className="mb-4 mt-1.5 max-w-2xl text-sm leading-relaxed text-grafia">{sub}</p>}
    <div className={sub ? '' : 'mt-4'}>{children}</div>
  </section>
)

const Tile = ({ n, r, pequeno }) => (
  <div className="cartao p-4">
    <div className={`tabular-nums tracking-apertado ${pequeno ? 'text-base font-medium leading-snug' : 'text-3xl font-semibold'}`}>{n}</div>
    <div className="rotulo mt-1.5">{r}</div>
  </div>
)

const Aviso = ({ children }) => <p className="mx-auto max-w-2xl px-6 py-20 text-grafia">{children}</p>
