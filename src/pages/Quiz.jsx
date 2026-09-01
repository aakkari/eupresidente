import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { iniciarSessao, salvarRespostas, finalizarSessao } from '../lib/api.js'

const OPCOES = [
  { v: -2, r: 'Discordo totalmente' },
  { v: -1, r: 'Discordo' },
  { v:  0, r: 'Não tenho posição formada' },
  { v:  1, r: 'Concordo' },
  { v:  2, r: 'Concordo totalmente' },
]

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

  useEffect(() => {
    iniciarSessao(modo, Object.fromEntries(params)).then(setSessao).catch(e => setErro(e.message))
  }, [modo])

  const perguntas = sessao?.perguntas ?? []
  const atual = perguntas[i]
  const fim = sessao && i >= perguntas.length
  const progresso = perguntas.length ? Math.round((i / perguntas.length) * 100) : 0

  function responder(valor) {
    setRespostas(r => ({ ...r, [atual.id]: valor }))
    setTempos(t => ({ ...t, [atual.id]: new Date().toISOString() }))
    setI(n => n + 1)
  }

  const prontas = useMemo(
    () => Object.entries(respostas).map(([question_id, value]) =>
      ({ question_id, value, answered_at: tempos[question_id] })),
    [respostas, tempos])

  async function concluir() {
    setEnviando(true); setErro(null)
    try {
      await salvarRespostas(sessao.token, prontas)
      await finalizarSessao(sessao.token, {
        consentimento_pesquisa: modo === 'long' ? consentimento : false,
        policy_version: 'v1',
      })
      ir(`/resultado?token=${sessao.token}`)
    } catch (e) {
      setErro(e.message); setEnviando(false)
    }
  }

  if (erro && !sessao) return <Aviso texto={erro} />
  if (!sessao) return <Aviso texto="Carregando..." />

  if (fim) return (
    <div className="mx-auto max-w-xl px-6 py-20">
      <h2 className="font-serif text-3xl">Terminou.</h2>
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

      {erro && <p className="mt-4 text-sm text-red-700">{erro}</p>}

      <button onClick={concluir} disabled={enviando} className="botao-forte mt-6 w-full">
        {enviando ? 'Calculando...' : 'Ver meu resultado'}
      </button>
    </div>
  )

  return (
    <div className="mx-auto max-w-xl px-6 py-12">
      <div className="mb-8">
        <div className="mb-2 flex justify-between text-xs text-grafia">
          <span>{i + 1} de {perguntas.length}</span>
          <button onClick={() => setI(n => Math.max(0, n - 1))} disabled={i === 0}
                  className="disabled:opacity-30">voltar</button>
        </div>
        <div className="h-1 rounded bg-borda">
          <div className="h-1 rounded bg-tinta transition-all" style={{ width: `${progresso}%` }} />
        </div>
      </div>

      <p className="font-serif text-2xl leading-snug">{atual.body}</p>

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
    </div>
  )
}

const Aviso = ({ texto }) => <p className="mx-auto max-w-xl px-6 py-20 text-grafia">{texto}</p>
