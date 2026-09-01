import { Routes, Route, Link, Navigate } from 'react-router-dom'
import Home from './pages/Home.jsx'
import Quiz from './pages/Quiz.jsx'
import Resultado from './pages/Resultado.jsx'
import AdminLayout from './pages/admin/AdminLayout.jsx'
import Perguntas from './pages/admin/Perguntas.jsx'
import Metricas from './pages/admin/Metricas.jsx'

export default function App() {
  return (
    <div className="min-h-screen">
      <header className="border-b border-borda">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
          <Link to="/" className="font-serif text-lg">Eu Presidente</Link>
          <Link to="/admin" className="text-xs text-grafia hover:text-tinta">admin</Link>
        </div>
      </header>

      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/responder" element={<Quiz />} />
        <Route path="/resultado" element={<Resultado />} />
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<Navigate to="perguntas" replace />} />
          <Route path="perguntas" element={<Perguntas />} />
          <Route path="metricas" element={<Metricas />} />
        </Route>
      </Routes>
    </div>
  )
}
