import { useCallback, useEffect, useState } from 'react'
import { Link, Navigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../lib/useAuth.js'
import { acaoComunidade, minhasComunidades, previaConvite, resumoInstrumento } from '../lib/api.js'
import MapaComunidade from '../components/MapaComunidade.jsx'
import Enviar from '../components/Enviar.jsx'

// A frase que a pessoa tem que ler antes de qualquer sim. Fica aqui, numa
// constante, porque ela aparece em tres lugares — criar, aceitar e voltar a
// compartilhar — e tres versoes ligeiramente diferentes da mesma promessa e
// como nao ter promessa nenhuma.
const AVISO = 'Ao entrar, sua posição política aparece no mapa da comunidade, com o seu nome, para todas as pessoas que estiverem lá. Você vê a delas do mesmo jeito. Dá para sair ou parar de aparecer quando quiser.'

export default function Comunidade() {
  const { token, carregando } = useAuth()
  const [params, setParams] = useSearchParams()
  const [dados, setDados] = useState(null)
  const [erro, setErro] = useState(null)
  const [selecionada, setSelecionada] = useState(null)
  const convite = params.get('convite')

  const recarregar = useCallback(async () => {
    if (!token) return
    try { setDados(await minhasComunidades(token)) } catch (e) { setErro(e.message) }
  }, [token])

  useEffect(() => { recarregar() }, [recarregar])

  if (carregando) return <Aviso>Carregando...</Aviso>
  // O convite entra no /entrar junto: quem clicou no link do amigo e nao tem
  // conta volta para ca depois de criar, em vez de perder o convite no caminho.
  if (!token) return <Navigate to={`/entrar?voltar=${encodeURIComponent(`/comunidade${convite ? `?convite=${convite}` : ''}`)}`} replace />

  const comunidades = dados?.comunidades ?? []
  const atual = comunidades.find(c => c.id === selecionada) ?? comunidades[0]

  return (
    <div className="mx-auto max-w-5xl px-6 py-12">
      <div className="mb-8">
        <p className="rotulo">Minha conta</p>
        <h1 className="titulo mt-2 text-4xl">Comunidade</h1>
        <p className="mt-2 max-w-2xl text-grafia">
          Um mapa com a sua gente. Você convida, cada pessoa aceita, e o grupo inteiro
          aparece no mesmo gráfico — com nome.
        </p>
      </div>

      {erro && <p className="mb-6 text-sm text-red-700">{erro}</p>}

      {convite && (
        <Convite token={token} convite={convite} aoResponder={(id) => {
          setParams({}, { replace: true })
          if (id) setSelecionada(id)
          recarregar()
        }} />
      )}

      {dados?.convites_recebidos?.length > 0 && !convite && (
        <section className="mb-10">
          <h2 className="subtitulo text-xl">Convites esperando você</h2>
          <div className="mt-3 space-y-2">
            {dados.convites_recebidos.map(c => (
              <div key={c.token} className="cartao flex flex-wrap items-center gap-3 p-4">
                <span className="min-w-0 flex-1 text-sm">
                  <strong>{c.convidado_por}</strong> convidou você para{' '}
                  <strong>{c.comunidade}</strong>
                </span>
                <Link to={`/comunidade?convite=${c.token}`} className="botao-leve text-xs">
                  Ver convite
                </Link>
              </div>
            ))}
          </div>
        </section>
      )}

      {dados === null && <p className="text-grafia">Carregando...</p>}

      {dados && !comunidades.length && !convite && (
        <Primeira token={token} aoCriar={(id) => { setSelecionada(id); recarregar() }} />
      )}

      {comunidades.length > 0 && (
        <>
          {comunidades.length > 1 && (
            <div className="mb-6 flex flex-wrap gap-1.5">
              {comunidades.map(c => (
                <button key={c.id} onClick={() => setSelecionada(c.id)}
                  className={`rounded-md px-3 py-1.5 text-sm transition ${
                    c.id === atual?.id ? 'bg-tinta text-papel' : 'border border-borda bg-white hover:border-tinta'}`}>
                  {c.nome} <span className="tabular-nums opacity-60">{c.total_membros}</span>
                </button>
              ))}
            </div>
          )}

          {atual && <Painel comunidade={atual} token={token} aoMudar={recarregar}
                            emailAtivo={dados.email_ativo} />}

          <details className="mt-12">
            <summary className="cursor-pointer text-sm text-grafia hover:text-tinta">
              Criar outra comunidade
            </summary>
            <div className="mt-4">
              <FormCriar token={token} aoCriar={(id) => { setSelecionada(id); recarregar() }} />
            </div>
          </details>
        </>
      )}
    </div>
  )
}

// -------------------------------------------------------------------- convite

function Convite({ token, convite, aoResponder }) {
  const [previa, setPrevia] = useState(null)
  const [erro, setErro] = useState(null)
  const [ocupado, setOcupado] = useState(false)

  useEffect(() => {
    previaConvite(convite).then(d => setPrevia(d.convite)).catch(e => setErro(e.message))
  }, [convite])

  async function responder(acao) {
    setOcupado(true); setErro(null)
    try {
      const r = await acaoComunidade(token, { acao, token: convite })
      aoResponder(r.id ?? null)
    } catch (e) { setErro(e.message); setOcupado(false) }
  }

  if (erro && !previa) return (
    <div className="cartao mb-10 p-6">
      <p className="text-sm text-red-700">{erro}</p>
      <Link to="/comunidade" className="botao-leve mt-4 inline-flex text-xs">Voltar</Link>
    </div>
  )
  if (!previa) return <p className="mb-10 text-grafia">Abrindo convite...</p>

  return (
    <div className="cartao mb-10 p-7">
      <p className="rotulo">Convite</p>
      <h2 className="subtitulo mt-2 text-2xl text-balance">
        {previa.convidado_por} convidou você para <strong>{previa.comunidade}</strong>.
      </h2>

      {/* O aviso vem antes dos botoes e sem letra miuda. Consentimento que
          precisa ser procurado na tela nao e consentimento. */}
      <div className="mt-5 border-l-2 border-tinta pl-4">
        <p className="text-sm font-medium">O que acontece quando você aceita</p>
        <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-grafia">{AVISO}</p>
      </div>

      {erro && <p className="mt-4 text-sm text-red-700">{erro}</p>}

      <div className="mt-6 flex flex-wrap gap-2">
        <button onClick={() => responder('aceitar')} disabled={ocupado} className="botao-forte">
          {ocupado ? 'Entrando...' : 'Aceitar e entrar'}
        </button>
        <button onClick={() => responder('recusar')} disabled={ocupado} className="botao-leve">
          Não, obrigado
        </button>
      </div>

      <p className="mt-3 text-xs text-tenue">
        Se recusar, ninguém é avisado e nada seu é compartilhado.
      </p>
    </div>
  )
}

// --------------------------------------------------------------------- painel

function Painel({ comunidade, token, aoMudar, emailAtivo }) {
  const [familias, setFamilias] = useState([])

  // Referencia de fundo do mapa. Vem do instrumento e nao de um resultado
  // porque a comunidade pode nao ter nenhum resultado ainda.
  useEffect(() => {
    resumoInstrumento().then(d => setFamilias(d.familias ?? [])).catch(() => {})
  }, [])

  const eu = comunidade.membros.find(m => m.sou_eu)?.user_id ?? null

  const comPosicao = comunidade.membros.filter(m => m.vector)
  const semPosicao = comunidade.membros.filter(m => !m.vector)

  return (
    <div className="space-y-10">
      <section>
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="subtitulo text-2xl">{comunidade.nome}</h2>
            <p className="mt-1 text-sm text-grafia">
              {comunidade.total_membros} {comunidade.total_membros === 1 ? 'pessoa' : 'pessoas'}
              {comunidade.total_membros > comunidade.membros.length &&
                ` · ${comunidade.total_membros - comunidade.membros.length} sem aparecer no mapa`}
            </p>
          </div>
          <Compartilhando comunidade={comunidade} token={token} aoMudar={aoMudar} />
        </div>

        {comPosicao.length >= 1 ? (
          <MapaComunidade membros={comunidade.membros} familias={familias} eu={eu} />
        ) : (
          <div className="cartao p-6 text-sm leading-relaxed text-grafia">
            Ninguém da comunidade tem resultado ainda. Assim que alguém responder o
            questionário, o mapa aparece aqui.
          </div>
        )}
      </section>

      <section>
        <h2 className="subtitulo text-xl">Quem está aqui</h2>
        <div className="cartao mt-3 divide-y divide-borda">
          {comPosicao.map(m => (
            <div key={m.user_id} className="flex flex-wrap items-center gap-3 p-4">
              <span className="w-10 shrink-0 text-xl font-semibold tabular-nums tracking-apertado">
                {m.posicao?.posicao}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-medium">{m.nome}</span>
                <span className="block text-xs text-grafia">
                  {m.posicao?.rotulo}{m.familia && ` · ${m.familia}`}
                </span>
              </span>
              <span className="shrink-0 text-xs text-tenue">
                {m.quando && new Date(m.quando).toLocaleDateString('pt-BR')}
              </span>
            </div>
          ))}
          {semPosicao.map(m => (
            <div key={m.user_id} className="flex items-center gap-3 p-4">
              <span className="w-10 shrink-0 text-center text-grafia">—</span>
              <span className="min-w-0 flex-1">
                <span className="block font-medium">{m.nome}</span>
                <span className="block text-xs text-grafia">ainda não respondeu</span>
              </span>
            </div>
          ))}
        </div>
      </section>

      <Convidar comunidade={comunidade} token={token} aoMudar={aoMudar} emailAtivo={emailAtivo} />

      <section className="border-t border-borda pt-6">
        <Sair comunidade={comunidade} token={token} aoMudar={aoMudar} />
      </section>
    </div>
  )
}

function Compartilhando({ comunidade, token, aoMudar }) {
  const [ocupado, setOcupado] = useState(false)

  async function alternar() {
    setOcupado(true)
    try {
      await acaoComunidade(token, {
        acao: 'compartilhar', grupo: comunidade.id, compartilhando: !comunidade.compartilhando,
      })
      await aoMudar()
    } finally { setOcupado(false) }
  }

  return (
    <div className="text-right">
      <button onClick={alternar} disabled={ocupado}
              className={comunidade.compartilhando ? 'botao-leve text-xs' : 'botao-forte text-xs'}>
        {comunidade.compartilhando ? 'Parar de aparecer no mapa' : 'Voltar a aparecer no mapa'}
      </button>
      <p className="mt-1.5 max-w-[15rem] text-[11px] leading-snug text-tenue">
        {comunidade.compartilhando
          ? 'Sua posição está visível para quem está aqui.'
          : 'Você está na comunidade, mas fora do mapa.'}
      </p>
    </div>
  )
}

function Convidar({ comunidade, token, aoMudar, emailAtivo }) {
  const [email, setEmail] = useState('')
  const [ocupado, setOcupado] = useState(false)
  const [erro, setErro] = useState(null)
  const [ultimo, setUltimo] = useState(null)

  async function enviar(e) {
    e.preventDefault()
    setOcupado(true); setErro(null); setUltimo(null)
    try {
      const r = await acaoComunidade(token, { acao: 'convidar', grupo: comunidade.id, email })
      setUltimo({ ...r, email })
      setEmail('')
      await aoMudar()
    } catch (e2) { setErro(e2.message) }
    setOcupado(false)
  }

  async function cancelar(id) {
    await acaoComunidade(token, { acao: 'cancelar_convite', id })
    await aoMudar()
  }

  return (
    <section>
      <h2 className="subtitulo text-xl">Convidar</h2>
      <p className="mb-3 mt-1 max-w-2xl text-sm leading-relaxed text-grafia">
        {emailAtivo
          ? 'O convite chega por e-mail, explicando o que a pessoa está aceitando antes de ela decidir.'
          : 'O convite vira um link. Mande você mesmo — convite que chega pelo seu WhatsApp é aceito muito mais do que e-mail de remetente desconhecido.'}
      </p>

      <form onSubmit={enviar} className="cartao flex flex-wrap items-end gap-3 p-5">
        <div className="min-w-[220px] flex-1">
          <label className="rotulo">E-mail de quem você quer convidar</label>
          <input className="campo mt-1.5" type="email" required value={email}
                 placeholder="pessoa@exemplo.com" onChange={e => setEmail(e.target.value)} />
        </div>
        <button className="botao-forte" disabled={ocupado}>
          {ocupado ? 'Criando...' : 'Convidar'}
        </button>
      </form>

      {erro && <p className="mt-2 text-sm text-red-700">{erro}</p>}

      {ultimo && (
        <div className="cartao mt-3 p-5">
          <p className="text-sm">
            {ultimo.enviado
              ? <>Convite enviado para <strong>{ultimo.email}</strong>.</>
              : <>Convite criado para <strong>{ultimo.email}</strong>. Mande o link para ela:</>}
          </p>
          <p className="mt-2 break-all rounded-md bg-papel p-3 font-mono text-xs">{ultimo.link}</p>
          <div className="mt-3">
            <Enviar link={ultimo.link} compacto />
          </div>
        </div>
      )}

      {comunidade.convites?.length > 0 && (
        <div className="cartao mt-3 divide-y divide-borda">
          <p className="rotulo p-4 pb-2">Convites que ainda não foram respondidos</p>
          {comunidade.convites.map(c => (
            <div key={c.id} className="flex flex-wrap items-center gap-3 p-4 text-sm">
              <span className="min-w-0 flex-1">{c.email}</span>
              <span className="shrink-0 text-xs text-tenue">
                {new Date(c.created_at).toLocaleDateString('pt-BR')}
              </span>
              <button onClick={() => cancelar(c.id)} className="botao-leve shrink-0 text-xs">
                Cancelar
              </button>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

function Sair({ comunidade, token, aoMudar }) {
  const [confirmando, setConfirmando] = useState(false)
  const [ocupado, setOcupado] = useState(false)

  if (!confirmando) return (
    <button onClick={() => setConfirmando(true)} className="text-sm text-grafia hover:text-tinta">
      Sair de {comunidade.nome}
    </button>
  )

  return (
    <div>
      <p className="text-sm font-medium">Sair de {comunidade.nome}?</p>
      <p className="mt-1 max-w-xl text-xs leading-relaxed text-grafia">
        Você sai do mapa e da lista na hora. Ninguém é avisado. Se for a última pessoa,
        a comunidade deixa de existir.
      </p>
      <div className="mt-3 flex gap-2">
        <button disabled={ocupado} className="botao-forte text-xs"
          onClick={async () => {
            setOcupado(true)
            try { await acaoComunidade(token, { acao: 'sair', grupo: comunidade.id }); await aoMudar() }
            finally { setOcupado(false) }
          }}>
          {ocupado ? 'Saindo...' : 'Sair'}
        </button>
        <button onClick={() => setConfirmando(false)} className="botao-leve text-xs">Ficar</button>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------- criar

function Primeira({ token, aoCriar }) {
  return (
    <div>
      <div className="cartao p-7">
        <h2 className="subtitulo text-2xl text-balance">
          Você ainda não tem uma comunidade.
        </h2>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-grafia">
          Dê um nome — a família, a firma, a turma da facul — e convide quem você quer no
          mapa. Cada pessoa decide se entra, e o mapa só mostra quem disse sim.
        </p>
        <div className="mt-6">
          <FormCriar token={token} aoCriar={aoCriar} />
        </div>
      </div>
    </div>
  )
}

function FormCriar({ token, aoCriar }) {
  const [nome, setNome] = useState('')
  const [ocupado, setOcupado] = useState(false)
  const [erro, setErro] = useState(null)

  async function enviar(e) {
    e.preventDefault()
    setOcupado(true); setErro(null)
    try {
      const r = await acaoComunidade(token, { acao: 'criar', nome })
      setNome(''); aoCriar(r.id)
    } catch (e2) { setErro(e2.message) }
    setOcupado(false)
  }

  return (
    <form onSubmit={enviar}>
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-[220px] flex-1">
          <label className="rotulo">Nome da comunidade</label>
          <input className="campo mt-1.5" value={nome} required maxLength={60}
                 placeholder="Família Akkari, Turma de 2003, Escritório..."
                 onChange={e => setNome(e.target.value)} />
        </div>
        <button className="botao-forte" disabled={ocupado}>
          {ocupado ? 'Criando...' : 'Criar comunidade'}
        </button>
      </div>
      <p className="mt-3 max-w-xl text-xs leading-relaxed text-tenue">{AVISO}</p>
      {erro && <p className="mt-2 text-sm text-red-700">{erro}</p>}
    </form>
  )
}

const Aviso = ({ children }) => <p className="mx-auto max-w-2xl px-6 py-20 text-grafia">{children}</p>
