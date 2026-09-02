import { useEffect, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useAuth } from '../lib/useAuth.js'
import { meusResultados, meuPerfil, salvarPerfil } from '../lib/api.js'
import Evolucao from '../components/Evolucao.jsx'

export default function Conta() {
  const { token, carregando, sair } = useAuth()
  const [perfil, setPerfil] = useState(null)
  const [lista, setLista] = useState(null)
  const [erro, setErro] = useState(null)

  useEffect(() => {
    if (!token) return
    meuPerfil(token).then(setPerfil).catch(e => setErro(e.message))
    meusResultados(token).then(d => setLista(d.resultados)).catch(e => setErro(e.message))
  }, [token])

  if (carregando) return <Aviso>Carregando...</Aviso>
  if (!token) return <Navigate to="/entrar" replace />

  const emOrdem = [...(lista ?? [])].sort((a, b) => new Date(b.quando) - new Date(a.quando))
  const ultimo = emOrdem[0]

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

      <Bloco titulo="Como sua posição mudou"
             sub="Cada ponto é um questionário que você respondeu. A linha só faz sentido com mais de um.">
        <Evolucao resultados={lista ?? []} />
      </Bloco>

      <Bloco titulo="Seus resultados">
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
          {emOrdem.map(r => (
            <Link key={r.token} to={`/resultado?token=${r.token}`}
                  className="cartao flex items-center gap-4 p-4 transition hover:border-tinta">
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
              <span className="text-xs text-tenue">ver →</span>
            </Link>
          ))}
        </div>
      </Bloco>

      <Bloco titulo="Seus dados"
             sub="Guardamos o mínimo: nome e, se quiser, telefone. Nunca CPF ou documento — identificador único somado a opinião política é o pior tipo de base para existir.">
        <FormPerfil token={token} perfil={perfil} aoSalvar={setPerfil} />
      </Bloco>
    </div>
  )
}

function FormPerfil({ token, perfil, aoSalvar }) {
  const [nome, setNome] = useState('')
  const [apelido, setApelido] = useState('')
  const [fone, setFone] = useState('')
  const [estado, setEstado] = useState(null)

  useEffect(() => {
    if (!perfil) return
    setNome(perfil.full_name ?? ''); setApelido(perfil.display_name ?? ''); setFone(perfil.phone ?? '')
  }, [perfil])

  async function enviar(e) {
    e.preventDefault()
    setEstado('salvando')
    try {
      await salvarPerfil(token, { full_name: nome, display_name: apelido, phone: fone })
      aoSalvar(p => ({ ...p, full_name: nome, display_name: apelido, phone: fone }))
      setEstado('salvo'); setTimeout(() => setEstado(null), 2500)
    } catch { setEstado('erro') }
  }

  return (
    <form onSubmit={enviar} className="cartao p-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <Campo rotulo="Nome completo" valor={nome} set={setNome} placeholder="como no documento" />
        <Campo rotulo="Como quer ser chamado" valor={apelido} set={setApelido} placeholder="aparece nos grupos" />
        <Campo rotulo="Telefone (opcional)" valor={fone} set={setFone} placeholder="(11) 90000-0000" />
        <div>
          <label className="rotulo">Email</label>
          <input className="campo mt-1.5 bg-papel text-grafia" value={perfil?.email ?? ''} disabled />
          <p className="mt-1 text-[11px] text-tenue">O email é sua chave de acesso e não muda por aqui.</p>
        </div>
      </div>
      <div className="mt-5 flex items-center gap-3">
        <button className="botao-forte" disabled={estado === 'salvando'}>
          {estado === 'salvando' ? 'Salvando...' : 'Salvar'}
        </button>
        {estado === 'salvo' && <span className="text-xs text-grafia">Salvo.</span>}
        {estado === 'erro' && <span className="text-xs text-red-700">Não consegui salvar.</span>}
      </div>
    </form>
  )
}

const Campo = ({ rotulo, valor, set, placeholder }) => (
  <div>
    <label className="rotulo">{rotulo}</label>
    <input className="campo mt-1.5" value={valor} placeholder={placeholder}
           onChange={e => set(e.target.value)} />
  </div>
)

const Bloco = ({ titulo, sub, children }) => (
  <section className="mb-12">
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
