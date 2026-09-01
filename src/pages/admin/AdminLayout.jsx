import { useEffect, useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { supabase } from '../../lib/supabase.js'

// A autorizacao de verdade acontece no servidor: cada Function confere o token
// contra ADMIN_EMAILS. Esta tela so evita mostrar um painel vazio para quem
// nao esta logado — esconder botao nao e controle de acesso.
export default function AdminLayout() {
  const [sessao, setSessao] = useState(undefined)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSessao(data.session))
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSessao(s))
    return () => sub.subscription.unsubscribe()
  }, [])

  if (sessao === undefined) return <p className="p-10 text-grafia">Carregando...</p>
  if (!sessao) return <Login />

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <div className="mb-6 flex items-center justify-between border-b border-borda pb-4">
        <nav className="flex gap-1">
          {[['perguntas', 'Perguntas'], ['metricas', 'Metricas']].map(([to, label]) => (
            <NavLink key={to} to={to}
              className={({ isActive }) =>
                `rounded px-3 py-1.5 text-sm ${isActive ? 'bg-tinta text-papel' : 'text-grafia hover:text-tinta'}`}>
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="flex items-center gap-3 text-xs text-grafia">
          <span>{sessao.user.email}</span>
          <button onClick={() => supabase.auth.signOut()} className="hover:text-tinta">sair</button>
        </div>
      </div>
      <Outlet context={{ token: sessao.access_token }} />
    </div>
  )
}

function Login() {
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState(null)
  const [indo, setIndo] = useState(false)

  async function entrar(e) {
    e.preventDefault()
    setIndo(true); setErro(null)
    const { error } = await supabase.auth.signInWithPassword({ email, password: senha })
    if (error) { setErro(error.message); setIndo(false) }
  }

  return (
    <form onSubmit={entrar} className="mx-auto max-w-sm px-6 py-20">
      <h1 className="font-serif text-2xl">Admin</h1>
      <p className="mt-1 text-sm text-grafia">Acesso restrito.</p>
      <input className="campo mt-6" type="email" placeholder="email" value={email}
             onChange={e => setEmail(e.target.value)} required />
      <input className="campo mt-2" type="password" placeholder="senha" value={senha}
             onChange={e => setSenha(e.target.value)} required />
      {erro && <p className="mt-3 text-sm text-red-700">{erro}</p>}
      <button className="botao-forte mt-4 w-full" disabled={indo}>
        {indo ? 'Entrando...' : 'Entrar'}
      </button>
    </form>
  )
}
