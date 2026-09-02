import { Routes, Route, Link, Navigate } from 'react-router-dom'
import Home from './pages/Home.jsx'
import Quiz from './pages/Quiz.jsx'
import Resultado from './pages/Resultado.jsx'
import Entrar from './pages/Entrar.jsx'
import Meus from './pages/Meus.jsx'
import Comunidade from './pages/Comunidade.jsx'
import Contato from './pages/Contato.jsx'
import { useAuth } from './lib/useAuth.js'
import AdminLayout from './pages/admin/AdminLayout.jsx'
import Perguntas from './pages/admin/Perguntas.jsx'
import Metricas from './pages/admin/Metricas.jsx'
import Plano from './pages/admin/Plano.jsx'
import Assinantes from './pages/admin/Assinantes.jsx'
import Usuarios from './pages/admin/Usuarios.jsx'
import Resumo from './pages/admin/Resumo.jsx'
import Populacao from './pages/admin/Populacao.jsx'
import Comunidades from './pages/admin/Comunidades.jsx'
import Perfis from './pages/admin/Perfis.jsx'
import AdminContato from './pages/admin/Contato.jsx'

export default function App() {
  const { token, nome } = useAuth()

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 border-b border-borda bg-papel/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link to="/" className="text-[15px] font-semibold tracking-apertado">
            Eu Presidente
          </Link>
          <nav className="flex items-center gap-2">
            {/* Logado, o cabecalho mostra o nome da pessoa. "Minha conta" so
                aparece para quem ainda nao tem uma. */}
            <Link to={token ? '/conta' : '/entrar'}
                  className="max-w-[13rem] truncate rounded-full border border-borda bg-white px-4 py-2 text-xs font-medium transition hover:border-tinta">
              {token ? (nome || 'Minha conta') : 'Minha conta'}
            </Link>
          </nav>
        </div>
      </header>

      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/responder" element={<Quiz />} />
        <Route path="/resultado" element={<Resultado />} />
        <Route path="/entrar" element={<Entrar />} />
        <Route path="/conta" element={<Meus />} />
        <Route path="/comunidade" element={<Comunidade />} />
        <Route path="/contato" element={<Contato />} />
        <Route path="/meus" element={<Navigate to="/conta" replace />} />
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<Resumo />} />
          <Route path="perguntas" element={<Perguntas />} />
          <Route path="metricas" element={<Metricas />} />
          <Route path="plano" element={<Plano />} />
          <Route path="assinantes" element={<Assinantes />} />
          <Route path="usuarios" element={<Usuarios />} />
          <Route path="populacao" element={<Populacao />} />
          <Route path="comunidades" element={<Comunidades />} />
          <Route path="perfis" element={<Perfis />} />
          <Route path="contato" element={<AdminContato />} />
        </Route>
      </Routes>

      <footer className="border-t border-borda">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-5 gap-y-2 px-6 py-8 text-xs text-grafia">
          <span className="font-medium text-tinta">Eu Presidente</span>
          <Link to="/contato" className="hover:text-tinta">Fale comigo</Link>
          <Link to="/comunidade" className="hover:text-tinta">Comunidade</Link>
          <span className="ml-auto">Opinião política é dado sensível. Tratamos como tal.</span>
        </div>
      </footer>
    </div>
  )
}
