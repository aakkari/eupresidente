import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { buscarResultado } from '../lib/api.js'
import EixoBarra from '../components/EixoBarra.jsx'
import ReguaPolitica from '../components/ReguaPolitica.jsx'

const EIXOS = ['ECO', 'SOC', 'AUT', 'NAC', 'DEM', 'AMB']

export default function Resultado() {
  const [params] = useSearchParams()
  const [dados, setDados] = useState(null)
  const [erro, setErro] = useState(null)
  const token = params.get('token')

  useEffect(() => {
    if (!token) return setErro('link sem token')
    buscarResultado(token).then(setDados).catch(e => setErro(e.message))
  }, [token])

  if (erro) return <p className="mx-auto max-w-2xl px-6 py-20 text-grafia">{erro}</p>
  if (!dados) return <p className="mx-auto max-w-2xl px-6 py-20 text-grafia">Carregando...</p>

  const { resultado, arquetipo, arquetipo_secundario, instrumento, posicao } = dados
  const eixos = instrumento?.axes ?? {}

  return (
    <div className="mx-auto max-w-2xl px-6 py-16">
      <ReguaPolitica posicao={posicao} />

      <p className="rotulo mt-12">Sua família política</p>

      <div className="mt-4 flex items-start gap-4">
        <div className="mt-1.5 h-10 w-1.5 shrink-0 rounded"
             style={{ background: arquetipo?.color ?? '#12141a' }} />
        <div>
          <h1 className="font-serif text-4xl leading-tight">{arquetipo?.name}</h1>
          <p className="mt-1 text-grafia">{arquetipo?.tagline}</p>
        </div>
      </div>

      <p className="mt-6 leading-relaxed">{arquetipo?.description}</p>

      {arquetipo?.schools?.length > 0 && (
        <p className="mt-4 text-sm text-grafia">
          <span className="rotulo">Onde ler mais</span><br />
          {arquetipo.schools.join(' · ')}
        </p>
      )}

      {arquetipo_secundario && (
        <div className="cartao mt-6 p-4 text-sm">
          <span className="rotulo">Quase lá também</span>
          <p className="mt-1">
            Você ficou a uma distância parecida de <strong>{arquetipo_secundario.name}</strong>.
            Isso não é indecisão: é sinal de que você combina duas tradições que costumam
            andar separadas.
          </p>
        </div>
      )}

      <h2 className="mt-12 font-serif text-2xl">Seus seis eixos</h2>
      <div className="mt-4 divide-y divide-borda">
        {EIXOS.map(e => (
          <EixoBarra key={e} eixo={e}
                     valor={Number(resultado.vector?.[e] ?? 0)}
                     confianca={Number(resultado.confidence?.[e] ?? 0)}
                     meta={eixos[e]} />
        ))}
      </div>

      {resultado.tensions?.length > 0 && (
        <div className="mt-12">
          <h2 className="font-serif text-2xl">Onde você não cabe na caixa</h2>
          <p className="mt-2 text-grafia">
            Nestes eixos você se afasta do arquétipo que mais se parece com você. É a
            parte mais interessante do seu perfil — ninguém é a média da própria família
            política.
          </p>
          <ul className="mt-4 space-y-2">
            {resultado.tensions.map(e => (
              <li key={e} className="cartao p-3 text-sm">
                <strong>{eixos[e]?.nome ?? e}</strong>
                {' — '}você está em {Number(resultado.vector[e]).toFixed(2)}, enquanto
                {' '}{arquetipo?.name} costuma ficar em {Number(arquetipo?.centroid?.[e] ?? 0).toFixed(2)}.
              </li>
            ))}
          </ul>
        </div>
      )}

      {resultado.quality_flags?.length > 0 && (
        <p className="mt-10 text-xs text-grafia">
          Marcamos esta resposta como {resultado.quality_flags.join(', ')} — por isso ela
          não entra na base de pesquisa. Seu resultado continua valendo para você.
        </p>
      )}

      <p className="mt-10 text-xs text-grafia">
        Guarde este link: é por ele que você volta ao seu resultado.
      </p>
    </div>
  )
}
