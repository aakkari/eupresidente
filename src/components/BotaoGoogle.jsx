import { useEffect, useState } from 'react'
import { provedores, entrarComGoogle } from '../lib/oauth.js'

// So aparece quando o provedor esta ligado no Supabase. Ver comentario em
// oauth.js: o botao segue o painel, nao o deploy.
export default function BotaoGoogle({ voltarPara, rotulo, aoIr, desabilitado }) {
  const [ativo, setAtivo] = useState(false)
  const [indo, setIndo] = useState(false)
  const [erro, setErro] = useState(null)

  useEffect(() => { provedores().then(p => setAtivo(Boolean(p.google))) }, [])
  if (!ativo) return null

  async function clicar() {
    setIndo(true); setErro(null)
    try {
      // aoIr fecha a sessao e guarda o token antes de sair do site: dali em
      // diante a pagina e descartada, e o que nao foi gravado se perde.
      if (aoIr) await aoIr()
      await entrarComGoogle(voltarPara)
    } catch (e) {
      setErro(e.message); setIndo(false)
    }
  }

  return (
    <div>
      <button type="button" onClick={clicar} disabled={indo || desabilitado}
              className="botao-leve flex w-full items-center justify-center gap-2.5 py-3">
        <svg viewBox="0 0 48 48" className="h-5 w-5" aria-hidden="true">
          <path fill="#4285F4" d="M45.1 24.5c0-1.6-.1-3.2-.4-4.7H24v8.9h11.8c-.5 2.7-2 5-4.4 6.6v5.5h7.1c4.2-3.8 6.6-9.5 6.6-16.3z"/>
          <path fill="#34A853" d="M24 46c6 0 11-2 14.6-5.4l-7.1-5.5c-2 1.3-4.5 2.1-7.5 2.1-5.8 0-10.7-3.9-12.4-9.1H4.3v5.7C7.9 41.1 15.4 46 24 46z"/>
          <path fill="#FBBC05" d="M11.6 28.1c-.5-1.3-.7-2.7-.7-4.1s.3-2.8.7-4.1v-5.7H4.3C2.8 17.1 2 20.4 2 24s.8 6.9 2.3 9.8l7.3-5.7z"/>
          <path fill="#EA4335" d="M24 10.8c3.3 0 6.2 1.1 8.5 3.3l6.3-6.3C35 4.2 30 2 24 2 15.4 2 7.9 6.9 4.3 14.2l7.3 5.7c1.7-5.2 6.6-9.1 12.4-9.1z"/>
        </svg>
        {indo ? 'Abrindo o Google...' : (rotulo ?? 'Continuar com o Google')}
      </button>
      {erro && <p className="mt-2 text-sm text-red-700">{erro}</p>}

      <div className="my-4 flex items-center gap-3 text-xs text-tenue">
        <span className="h-px flex-1 bg-borda" />ou<span className="h-px flex-1 bg-borda" />
      </div>
    </div>
  )
}
