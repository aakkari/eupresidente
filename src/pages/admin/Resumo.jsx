import { useEffect, useState } from 'react'
import { Link, useOutletContext } from 'react-router-dom'
import { adminResumo } from '../../lib/api.js'

// A home do admin. O estado de hoje em cima, o fluxo do periodo embaixo.
//
// A separacao importa: "23 assinantes" e uma coisa, "3 assinaram nos ultimos 7
// dias" e outra, e misturar as duas num painel so faz o numero grande parecer
// crescimento.
export default function Resumo() {
  const { token } = useOutletContext()
  const [d, setD] = useState(null)
  const [erro, setErro] = useState(null)
  const [janela, setJanela] = useState('30d')

  useEffect(() => { adminResumo(token).then(setD).catch(e => setErro(e.message)) }, [token])

  if (erro) return <p className="text-sm text-red-700">{erro}</p>
  if (!d) return <p className="text-grafia">Carregando...</p>

  const h = d.hoje
  const j = d.dados[janela]
  const reais = (c) => (c / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

  return (
    <div className="space-y-10">
      <section>
        <h2 className="subtitulo text-2xl">Hoje</h2>
        <p className="mb-4 mt-1 text-sm text-grafia">
          O estado do produto agora, sem recorte de data.
        </p>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          <Card n={h.contas} r="contas" para="/admin/usuarios"
                nota={h.contas > h.contas_confirmadas
                  ? `${h.contas - h.contas_confirmadas} sem confirmar e-mail` : null} />
          <Card n={h.assinantes} r="assinando agora" para="/admin/assinantes"
                nota={h.contas ? `${pct(h.assinantes, h.contas)} das contas` : null} />
          <Card n={reais(h.receita_centavos)} r="recebido no total" pequeno />
          <Card n={h.questionarios} r="questionários concluídos" para="/admin/populacao"
                nota={h.conclusao != null ? `${pct2(h.conclusao)} de quem começa termina` : null} />
          <Card n={h.perfis_preenchidos} r="perfis preenchidos"
                nota={h.contas ? `${pct(h.perfis_preenchidos, h.contas)} das contas` : null} />
          <Card n={h.comunidades} r="comunidades" para="/admin/comunidades" />
          <Card n={h.mensagens_novas} r="mensagens novas" para="/admin/contato"
                destaque={h.mensagens_novas > 0} />
          <Card n={h.resultados} r="resultados calculados" para="/admin/perfis" />
        </div>
      </section>

      <section>
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="subtitulo text-2xl">O que entrou no período</h2>
            <p className="mt-1 text-sm text-grafia">
              Fluxo, e não estoque: quanta coisa nova apareceu na janela escolhida.
            </p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {d.janelas.map(id => (
              <button key={id} onClick={() => setJanela(id)}
                className={`rounded-md px-3 py-1.5 text-xs transition ${
                  id === janela ? 'bg-tinta text-papel' : 'border border-borda bg-white hover:border-tinta'}`}>
                {d.dados[id].rotulo}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          <Card n={j.contas} r="contas novas" />
          <Card n={j.questionarios} r="questionários terminados"
                nota={j.iniciados > j.questionarios
                  ? `${j.iniciados - j.questionarios} começaram e largaram` : null} />
          <Card n={j.perfis} r="perfis preenchidos" />
          <Card n={j.assinaturas} r="assinaturas novas"
                nota={j.receita_centavos > 0 ? `${reais(j.receita_centavos)} no período` : null} />
          <Card n={j.comunidades} r="comunidades criadas" />
          <Card n={j.convites} r="convites enviados"
                nota={j.convites > 0
                  ? `${j.convites_aceitos} aceitos · ${pct(j.convites_aceitos, j.convites)}` : null} />
          <Card n={j.mensagens} r="mensagens recebidas" />
        </div>
      </section>

      <section>
        <h2 className="subtitulo text-xl">Ir direto para</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {[['/admin/usuarios', 'Usuários'], ['/admin/populacao', 'População'],
            ['/admin/comunidades', 'Comunidades'], ['/admin/perguntas', 'Perguntas'],
            ['/admin/perfis', 'Perfis'], ['/admin/plano', 'Plano'],
            ['/admin/contato', 'Contato'], ['/', 'Ver o site']].map(([to, r]) => (
            <Link key={to} to={to} className="botao-leve text-xs">{r}</Link>
          ))}
        </div>
      </section>
    </div>
  )
}

const pct = (a, b) => b ? `${Math.round((a / b) * 100)}%` : '—'
const pct2 = (v) => `${Math.round(v * 100)}%`

function Card({ n, r, nota, para, pequeno, destaque }) {
  const corpo = (
    <>
      <div className={`tabular-nums tracking-apertado ${
        pequeno ? 'text-xl font-semibold' : 'text-3xl font-semibold'}`}>{n ?? '—'}</div>
      <div className="rotulo mt-1.5">{r}</div>
      {nota && <div className="mt-1.5 text-[11px] leading-snug text-tenue">{nota}</div>}
    </>
  )
  const classe = `cartao p-4 ${destaque ? 'border-tinta' : ''} ${
    para ? 'block transition hover:border-tinta' : ''}`
  return para ? <Link to={para} className={classe}>{corpo}</Link> : <div className={classe}>{corpo}</div>
}
