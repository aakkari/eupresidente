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
      <header className="sticky top-0 z-20 border-b border-borda bg-papel/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link to="/" className="text-[15px] font-semibold tracking-apertado">
            Eu Presidente
          </Link>
          <nav className="flex items-center gap-2">
            <Link to={token ? '/conta' : '/entrar'}
                  className="rounded-full border border-borda bg-white px-4 py-2 text-xs font-medium transition hover:border-tinta">
              Minha conta
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
        <Route path="/meus" element={<Navigate to="/conta" replace />} />
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<Navigate to="perguntas" replace />} />
          <Route path="perguntas" element={<Perguntas />} />
          <Route path="metricas" element={<Metricas />} />
        </Route>
      </Routes>
    </div>
  )
}
