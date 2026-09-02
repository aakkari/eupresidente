import { useState } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { getSupabase, temSupabase } from '../lib/supabase.js'
import { vincularSessao } from '../lib/api.js'

export default function Entrar() {
  const [params] = useSearchParams()
  const ir = useNavigate()
  const voltarPara = params.get('token')     // veio da tela de resultado
  // Caminho interno para voltar depois de entrar. Quem clicou no link de
  // convite de um amigo e ainda nao tinha conta perderia o convite sem isso.
  const destino = caminhoInterno(params.get('voltar'))
  const [modo, setModo] = useState('criar')
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState(null)
  const [indo, setIndo] = useState(false)

  if (!temSupabase()) return (
    <Caixa titulo="Conta indisponível">
      Faltam as chaves do Supabase nesta instalação. O questionário funciona sem conta.
    </Caixa>
  )

  async function enviar(e) {
    e.preventDefault()
    setIndo(true); setErro(null)
    const sb = getSupabase()
    try {
      const { data, error } = modo === 'criar'
        ? await sb.auth.signUp({ email, password: senha })
        : await sb.auth.signInWithPassword({ email, password: senha })
      if (error) throw error

      const token = data.session?.access_token
      if (!token) {
        setErro('Conta criada. Confirme o email e entre para guardar seu resultado.')
        setIndo(false); return
      }
      // Vincula na hora: a pessoa veio do resultado justamente para guardá-lo.
      if (voltarPara) await vincularSessao(token, voltarPara).catch(() => {})
      ir(voltarPara ? `/resultado?token=${voltarPara}` : destino ?? '/conta')
    } catch (e) {
      setErro(e.message); setIndo(false)
    }
  }

  return (
    <form onSubmit={enviar} className="mx-auto max-w-sm px-6 py-16">
      <h1 className="titulo text-3xl">{modo === 'criar' ? 'Criar conta' : 'Entrar'}</h1>
      <p className="mt-2 text-sm leading-relaxed text-grafia">
        {voltarPara
          ? 'Sua conta guarda este resultado, deixa você comparar com amigos e refazer o teste depois para ver o que mudou.'
          : 'Guarde seus resultados, compare com amigos e acompanhe como sua posição muda ao longo do tempo.'}
      </p>

      <input className="campo mt-6" type="email" placeholder="seu email" value={email}
             onChange={e => setEmail(e.target.value)} required autoComplete="email" />
      <input className="campo mt-2" type="password" placeholder="senha" value={senha}
             onChange={e => setSenha(e.target.value)} required minLength={6}
             autoComplete={modo === 'criar' ? 'new-password' : 'current-password'} />

      {erro && <p className="mt-3 text-sm text-red-700">{erro}</p>}

      <button className="botao-forte mt-4 w-full" disabled={indo}>
        {indo ? 'Aguarde...' : modo === 'criar' ? 'Criar conta' : 'Entrar'}
      </button>

      <button type="button" onClick={() => { setModo(modo === 'criar' ? 'entrar' : 'criar'); setErro(null) }}
              className="mt-4 w-full text-sm text-grafia hover:text-tinta">
        {modo === 'criar' ? 'Já tenho conta' : 'Criar uma conta'}
      </button>

      <p className="mt-8 text-xs leading-relaxed text-grafia">
        Sua opinião política é dado sensível. A conta guarda seu resultado e nada mais —
        nada vai para a base de pesquisa sem você autorizar, separadamente.
        {voltarPara && <> <Link to={`/resultado?token=${voltarPara}`} className="underline">Voltar ao resultado</Link>.</>}
      </p>
    </form>
  )
}

const Caixa = ({ titulo, children }) => (
  <div className="mx-auto max-w-sm px-6 py-20">
    <h1 className="subtitulo text-2xl">{titulo}</h1>
    <p className="mt-2 text-sm text-grafia">{children}</p>
  </div>
)

// So caminho interno. Aceitar uma URL qualquer aqui transformaria o link de
// login num redirecionador aberto — mande /entrar?voltar=https://site-falso e
// a pessoa entra na conta e cai fora do site sem perceber.
//
// A checagem anterior era "comeca com / e nao com //", e nao bastava: o
// react-router normaliza barra invertida para barra, entao /\site-falso.com
// passava e virava //site-falso.com, que o navegador le como outro dominio.
// E a mesma familia do CVE-2025-68470. Aqui a regra e por lista do que pode
// aparecer, e nao por lista do que nao pode.
function caminhoInterno(valor) {
  if (!valor) return null
  const limpo = String(valor)
  return /^\/[A-Za-z0-9\-._~/?#[\]@!$&'()*+,;=%]*$/.test(limpo) && !limpo.startsWith('//')
    ? limpo : null
}
