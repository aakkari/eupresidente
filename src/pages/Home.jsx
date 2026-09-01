import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { resumoInstrumento } from '../lib/api.js'

export default function Home() {
  const ir = useNavigate()
  const [info, setInfo] = useState(null)

  // Os numeros vem do banco. Escrever a mao foi exatamente o que fez a home
  // anunciar 16 perguntas depois que o instrumento passou a ter 31.
  useEffect(() => { resumoInstrumento().then(setInfo).catch(() => {}) }, [])

  const descricao = (v, texto) => info
    ? `${info[v].perguntas} perguntas, cerca de ${info[v].minutos} minutos. ${texto}`
    : texto

  return (
    <div className="mx-auto max-w-2xl px-6 py-20">
      <p className="rotulo">Eu Presidente</p>
      <h1 className="mt-3 font-serif text-4xl leading-tight sm:text-5xl">
        Onde você está, de verdade.
      </h1>
      <p className="mt-5 text-lg leading-relaxed text-grafia">
        A maioria dos testes políticos te encaixa num quadrante de duas dimensões.
        Duas dimensões não dão conta: dá para defender o Estado na economia e a
        liberdade nos costumes, ou o mercado na economia e a mão pesada na
        segurança. Este mede seis eixos separados — e mostra onde você não cabe
        na própria caixa.
      </p>

      <div className="mt-10 grid gap-3 sm:grid-cols-2">
        <button onClick={() => ir('/responder?modo=short')} className="cartao p-5 text-left transition hover:border-tinta">
          <div className="font-medium">Versão curta</div>
          <div className="mt-1 text-sm text-grafia">{descricao('curta', 'Dá o retrato geral.')}</div>
        </button>

        <button onClick={() => ir('/responder?modo=long')} className="cartao p-5 text-left transition hover:border-tinta">
          <div className="font-medium">Versão completa</div>
          <div className="mt-1 text-sm text-grafia">{descricao('completa', 'É a única que entra na pesquisa.')}</div>
        </button>
      </div>

      <p className="mt-8 text-xs leading-relaxed text-grafia">
        Opinião política é dado sensível. Você responde sem cadastro, e nada vai
        para a base de pesquisa sem você marcar que aceita — separadamente, no
        fim. Podemos apagar tudo a qualquer momento.
      </p>
    </div>
  )
}
