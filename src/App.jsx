import { Routes, Route, Link, Navigate } from 'react-router-dom'
import Home from './pages/Home.jsx'
import Quiz from './pages/Quiz.jsx'
import Resultado from './pages/Resultado.jsx'
import Entrar from './pages/Entrar.jsx'
import Meus from './pages/Meus.jsx'
import { useAuth } from './lib/useAuth.js'
import AdminLayout from './pages/admin/AdminLayout.jsx'
import Perguntas from './pages/admin/Perguntas.jsx'
import Metricas from './pages/admin/Metricas.jsx'

export default function App() {
  const { token } = useAuth()

  return (
    <div className="min-h-screen">
      <header className="border-b border-borda">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
          <Link to="/" className="font-serif text-lg">Eu Presidente</Link>
          <nav className="flex items-center gap-4 text-xs text-grafia">
            <Link to={token ? '/meus' : '/entrar'} className="hover:text-tinta">
              {token ? 'meus resultados' : 'entrar'}
            </Link>
            <Link to="/admin" className="hover:text-tinta">admin</Link>
          </nav>
        </div>
      </header>

      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/responder" element={<Quiz />} />
        <Route path="/resultado" element={<Resultado />} />
        <Route path="/entrar" element={<Entrar />} />
        <Route path="/meus" element={<Meus />} />
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<Navigate to="perguntas" replace />} />
          <Route path="perguntas" element={<Perguntas />} />
          <Route path="metricas" element={<Metricas />} />
        </Route>
      </Routes>
    </div>
  )
}
