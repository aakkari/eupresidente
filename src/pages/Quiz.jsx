import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import AbrirConta from '../components/AbrirConta.jsx'
import { useAuth } from '../lib/useAuth.js'
import { getSupabase, temSupabase } from '../lib/supabase.js'
import { emPortugues } from '../lib/erroAuth.js'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { iniciarSessao, salvarRespostas, finalizarSessao, vincularSessao } from '../lib/api.js'

const OPCOES = [
  { v: -2, r: 'Discordo totalmente' },
  { v: -1, r: 'Discordo' },
  { v:  0, r: 'Não tenho posição formada' },
  { v:  1, r: 'Concordo' },
  { v:  2, r: 'Concordo totalmente' },
]

const CHAVE = 'eup:rascunho'
const VALIDADE = 24 * 60 * 60 * 1000

// Rascunho local. O envio ao servidor e a fonte da verdade; isto aqui existe
// para a pessoa reabrir a aba e continuar de onde parou sem depender de conta.
const lerRascunho = () => {
  try {
    const d = JSON.parse(localStorage.getItem(CHAVE) || 'null')
    if (!d) return null
    // Duas razoes para ignorar um rascunho: ele ja foi entregue ao servidor,
    // ou e velho demais. Quem volta ao questionario nessas duas situacoes quer
    // responder de novo, nao continuar — e retomar prendia a pessoa numa tela
    // de "Terminou." da qual nao havia saida, nem com F5.
    if (d.entregue || !d.quando || Date.now() - d.quando > VALIDADE) {
      limparRascunho()
      return null
    }
    return d
  } catch { return null }
}
const gravarRascunho = (d) => {
  try { localStorage.setItem(CHAVE, JSON.stringify({ ...d, quando: Date.now() })) }
  catch { /* modo privado */ }
}
const limparRascunho = () => {
  try { localStorage.removeItem(CHAVE) } catch { /* modo privado */ }
}

export default function Quiz() {
  const [params] = useSearchParams()
  const ir = useNavigate()
  const modo = params.get('modo') === 'short' ? 'short' : 'long'

  const [sessao, setSessao] = useState(null)
  const [i, setI] = useState(0)
  const [respostas, setRespostas] = useState({})
  const [tempos, setTempos] = useState({})
  const [erro, setErro] = useState(null)
  const [enviando, setEnviando] = useState(false)
  const [consentimento, setConsentimento] = useState(false)
  const [salvandoAgora, setSalvandoAgora] = useState(false)
  const [confirmandoNovo, setConfirmandoNovo] = useState(false)
  const pendentes = useRef([])
  const { token: login, carregando: carregandoLogin } = useAuth()

  useEffect(() => {
    // Espera o login resolver: criar a sessao antes disso a faria nascer orfa
    // justamente para quem esta logado, que e o caso que este efeito conserta.
    if (carregandoLogin) return

    const rascunho = lerRascunho()
    // Retoma sozinho quando e o mesmo modo: perguntar "quer continuar?" para
    // quem so recarregou a pagina e atrito sem ganho.
    if (rascunho?.modo === modo && rascunho.token && rascunho.perguntas?.length) {
      setSessao({ token: rascunho.token, perguntas: rascunho.perguntas, instrumento: rascunho.instrumento, mode: modo })
      setRespostas(rascunho.respostas ?? {})
      setI(rascunho.i ?? 0)
      return
    }
    iniciarSessao(modo, Object.fromEntries(params), login)
      .then(s => {
        setSessao(s)
        gravarRascunho({ modo, token: s.token, perguntas: s.perguntas, instrumento: s.instrumento, respostas: {}, i: 0 })
      })
      .catch(e => setErro(e.message))
  }, [modo, carregandoLogin, login])

  const perguntas = sessao?.perguntas ?? []
  const atual = perguntas[i]
  const fim = sessao && i >= perguntas.length

  // Envia em lote curto, e nao a cada clique: 90 requisicoes numa sessao
  // seriam desperdicio, e perder as ultimas duas respostas por fechar a aba
  // no meio e um risco pequeno perto de perder as noventa.
  const descarregar = useCallback(async (forcar = false) => {
    if (!sessao?.token || pendentes.current.length === 0) return
    if (!forcar && pendentes.current.length < 3) return
    const lote = pendentes.current
    pendentes.current = []
    setSalvandoAgora(true)
    try { await salvarRespostas(sessao.token, lote) }
    catch { pendentes.current = [...lote, ...pendentes.current] }  // devolve para tentar de novo
    setSalvandoAgora(false)
  }, [sessao])

  // Antes de fechar a aba, tenta descarregar o que sobrou.
  useEffect(() => {
    const aoSair = () => { descarregar(true) }
    window.addEventListener('pagehide', aoSair)
    return () => window.removeEventListener('pagehide', aoSair)
  }, [descarregar])

  function responder(valor) {
    const quando = new Date().toISOString()
    const novas = { ...respostas, [atual.id]: valor }
    setRespostas(novas)
    setTempos(t => ({ ...t, [atual.id]: quando }))
    pendentes.current.push({ question_id: atual.id, value: valor, answered_at: quando })
    gravarRascunho({ modo, token: sessao.token, perguntas, instrumento: sessao.instrumento, respostas: novas, i: i + 1 })
    setI(n => n + 1)
    descarregar()
  }

  // Fecha a sessao e calcula o resultado. Idempotente de proposito: se a
  // criacao da conta falhar logo depois, a pessoa corrige o e-mail e tenta de
  // novo sem reenviar noventa respostas.
  const finalizada = useRef(false)
  async function fechar() {
    if (finalizada.current) return
    await descarregar(true)
    // Reenvia tudo por seguranca: e idempotente por (sessao, pergunta), e o
    // custo de uma requisicao a mais e menor que o de perder uma resposta.
    const todas = Object.entries(respostas).map(([question_id, value]) =>
      ({ question_id, value, answered_at: tempos[question_id] }))
    if (todas.length) await salvarRespostas(sessao.token, todas)
    await finalizarSessao(sessao.token, {
      consentimento_pesquisa: modo === 'long' ? consentimento : false,
      policy_version: 'v1',
    })
    finalizada.current = true
    // A partir daqui as respostas vivem no servidor. Marcar em vez de apagar
    // porque a criacao da conta ainda pode falhar e a pessoa tentar de novo.
    gravarRascunho({ modo, token: sessao.token, entregue: true })
  }

  // conta == null e o caminho de quem ja esta logado ou preferiu ver sem conta.
  async function concluir(conta = null) {
    setEnviando(true); setErro(null)
    try {
      await fechar()

      let tk = login
      let confirmar = false
      if (conta) {
        const sb = getSupabase()
        const { data, error } = conta.modo === 'entrar'
          ? await sb.auth.signInWithPassword({ email: conta.email, password: conta.senha })
          : await sb.auth.signUp({
              email: conta.email,
              password: conta.senha,
              options: { data: { display_name: conta.nome } },
            })
        if (error) throw new Error(emPortugues(error.message))
        tk = data.session?.access_token ?? null
        // Com "confirmar e-mail" ligado no Supabase a conta nasce sem sessao.
        // O resultado nao pode ficar refem de um e-mail que pode nem chegar:
        // segue para a tela e avisa la o que falta.
        confirmar = !tk
      }

      // Rede para quem entrou na conta depois de comecar: a sessao nasceu
      // orfa, e vincular aqui evita o resultado ficar sem dono. Idempotente —
      // claim_session recusa sessao ja vinculada, e falhar aqui nao pode
      // segurar a pessoa longe do resultado dela.
      if (tk) await vincularSessao(tk, sessao.token, conta?.nome).catch(() => {})

      limparRascunho()
      ir(`/resultado?token=${sessao.token}${confirmar ? '&conta=confirmar' : ''}`)
    } catch (e) {
      setErro(e.message); setEnviando(false)
    }
  }

  // Segmentos por eixo: mostram que o assunto muda, sem dizer qual e — o
  // nome do tema no topo faria a pessoa responder o rotulo, nao a pergunta.
  const segmentos = useMemo(() => {
    const out = []
    for (const p of perguntas) {
      const ultimo = out[out.length - 1]
      if (ultimo && ultimo.axis === p.axis) ultimo.n++
      else out.push({ axis: p.axis, n: 1 })
    }
    return out
  }, [perguntas])

  if (erro && !sessao) return <Aviso>{erro}</Aviso>
  if (!sessao) return <Aviso>Carregando...</Aviso>

  if (fim) return (
    <div className="mx-auto max-w-xl px-6 py-20">
      <h2 className="titulo text-3xl">Terminou.</h2>
      <p className="mt-3 text-grafia">{Object.keys(respostas).length} respostas registradas.</p>

      {modo === 'long' && (
        <label className="cartao mt-8 flex gap-3 p-4 text-sm">
          <input type="checkbox" className="mt-0.5" checked={consentimento}
                 onChange={e => setConsentimento(e.target.checked)} />
          <span className="leading-relaxed">
            Autorizo o uso das minhas respostas, <strong>de forma anônima e agregada</strong>,
            em pesquisa de opinião. A linha da pesquisa não guarda ligação com você: não
            existe caminho de volta, nem para nós. Seu resultado individual aparece de
            qualquer forma — isto aqui é só sobre a pesquisa.
          </span>
        </label>
      )}

      {/* A conta nasce aqui, e o resultado esta atras dela. Antes a tela final
          tinha so "Ver meu resultado", e guardar virava um segundo passo,
          depois, numa outra tela, num botao que a pessoa nao tinha motivo para
          procurar — e por isso quase ninguem dava. Este e o unico instante em
          que a conta vale alguma coisa para ela: o resultado esta pronto, do
          outro lado. */}
      {login || !temSupabase() ? (
        <>
          {erro && <p className="mt-4 text-sm text-red-700">{erro}</p>}
          <button onClick={() => concluir()} disabled={enviando} className="botao-forte mt-6 w-full">
            {enviando ? 'Calculando...' : 'Ver meu resultado'}
          </button>
        </>
      ) : (
        <AbrirConta enviando={enviando} erro={erro} onEnviar={concluir} />
      )}

      {/* O convite saiu daqui. Nesta tela ele competia com o unico passo que
          importa — abrir a conta — e dava a impressao de que clicar nele fazia
          perder o resultado. Foi para o fim do report, onde a pessoa ja viu o
          que ganhou e sabe o que esta convidando o outro a ver. */}

      {/* Saida. Quem chegou ate esta tela e foi embora sem clicar voltava aqui
          para sempre, porque o rascunho ficava parado no fim: /responder abria
          direto em "Terminou.", e nem o F5 tirava. Isto nao fura a trava da
          conta — descarta e obriga a responder tudo de novo. */}
      <div className="mt-6 text-center">
        {confirmandoNovo ? (
          <p className="text-xs leading-relaxed text-grafia">
            Isto descarta este questionário e começa outro do zero.{' '}
            <button onClick={() => { limparRascunho(); window.location.reload() }}
                    className="underline hover:text-tinta">Descartar e recomeçar</button>
            {' · '}
            <button onClick={() => setConfirmandoNovo(false)}
                    className="underline hover:text-tinta">cancelar</button>
          </p>
        ) : (
          <button onClick={() => setConfirmandoNovo(true)}
                  className="text-xs text-grafia underline hover:text-tinta">
            começar um novo questionário
          </button>
        )}
      </div>
    </div>
  )

  return (
    <div className="mx-auto max-w-xl px-6 py-12">
      <div className="mb-8">
        <div className="mb-2 flex items-center justify-between text-xs text-grafia">
          <span>{i + 1} de {perguntas.length}</span>
          <span className="flex items-center gap-3">
            {salvandoAgora && <span className="text-[11px]">salvando…</span>}
            <button onClick={() => setI(n => Math.max(0, n - 1))} disabled={i === 0}
                    className="disabled:opacity-30">voltar</button>
          </span>
        </div>

        <div className="flex gap-1">
          {segmentos.map((seg, s) => {
            const antes = segmentos.slice(0, s).reduce((t, x) => t + x.n, 0)
            const feitas = Math.max(0, Math.min(seg.n, i - antes))
            return (
              <div key={s} className="h-1 flex-1 overflow-hidden rounded bg-borda"
                   style={{ flexGrow: seg.n }}>
                <div className="h-1 bg-tinta transition-all"
                     style={{ width: `${(feitas / seg.n) * 100}%` }} />
              </div>
            )
          })}
        </div>
      </div>

      <p className="subtitulo text-2xl leading-snug">{atual.body}</p>

      <div className="mt-8 space-y-2">
        {OPCOES.map(o => (
          <button key={o.v} onClick={() => responder(o.v)}
                  className={`w-full rounded-md border px-4 py-3 text-left text-sm transition
                    ${respostas[atual.id] === o.v
                      ? 'border-tinta bg-tinta text-papel'
                      : 'border-borda bg-white hover:border-tinta'}`}>
            {o.r}
          </button>
        ))}
      </div>

      <p className="mt-8 text-xs text-grafia">
        Suas respostas são salvas conforme você avança. Pode fechar e voltar depois.
      </p>
    </div>
  )
}

const Aviso = ({ children }) => <p className="mx-auto max-w-xl px-6 py-20 text-grafia">{children}</p>
