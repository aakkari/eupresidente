import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { resumoInstrumento } from '../lib/api.js'
import { MapaArte, ReguaArte, EixosArte, MapaExemplo } from '../components/ArteHome.jsx'

export default function Home() {
  const ir = useNavigate()
  const [info, setInfo] = useState(null)

  // Os numeros vem do banco. Escrever a mao foi o que fez a home anunciar
  // 16 perguntas depois que o instrumento passou a ter 31.
  useEffect(() => { resumoInstrumento().then(setInfo).catch(() => {}) }, [])

  return (
    <div>
      {/* Abertura */}
      <section className="mx-auto max-w-6xl px-6 pb-8 pt-16 sm:pt-24">
        <div className="grid items-center gap-12 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <p className="rotulo">Autoconhecimento político</p>
            {/* Sem <br /> fixo: 'posicionamento' e longa demais e a quebra
                manual deixava linhas de uma palavra so. text-balance
                distribui as linhas de forma pareja em qualquer largura. */}
            <h1 className="titulo mt-5 text-balance text-[2.5rem] sm:text-5xl lg:text-[3.5rem]">
              Descubra qual é o seu posicionamento político.
            </h1>
            <p className="mt-7 max-w-xl text-lg leading-relaxed text-grafia">
              Uma jornada que não serve só para você se classificar. Serve para entender
              de onde vêm as suas posições, o que elas têm de contraditório, e como
              debater com família e amigos de um jeito mais firme — porque você vai
              saber o que pensa e por quê.
            </p>

            <div className="mt-9 flex flex-wrap items-center gap-3">
              <button onClick={() => ir('/responder?modo=long')} className="botao-forte px-7 py-3.5 text-base">
                Começar a jornada
              </button>
              <button onClick={() => ir('/responder?modo=short')} className="botao-leve">
                Prefiro a versão rápida
              </button>
            </div>

            <p className="mt-5 text-sm text-tenue">
              {/* info?.completa, e nao so info: uma resposta 200 sem corpo JSON
                  (pagina de erro do Netlify, funcao fria) chega aqui como {},
                  que e verdadeiro — e ai a landing inteira virava tela branca
                  por causa de uma linha de rodape. */}
              {info?.completa
                ? `${info.completa.perguntas} perguntas, cerca de ${info.completa.minutos} minutos · versão rápida com ${info.curta?.perguntas}, em ${info.curta?.minutos}`
                : 'Duas versões: uma completa e uma rápida.'}
              {' '}O resultado abre numa conta gratuita.
            </p>
          </div>

          <div className="mx-auto w-full max-w-md lg:max-w-none">
            <MapaArte className="w-full" comEixos />
          </div>
        </div>
      </section>

      {/* O que a pessoa recebe. Mostrado em chave grafica, nao explicado em
          lista: a intencao e dar vontade de ver o proprio, nao ensinar. */}
      <section className="mt-24 border-y border-borda bg-white">
        <div className="mx-auto max-w-6xl px-6 py-16">
          <p className="rotulo">No fim da jornada</p>
          <h2 className="subtitulo mt-3 max-w-2xl text-3xl sm:text-4xl">
            Um retrato seu, não um rótulo.
          </h2>

          <div className="mt-12 grid gap-10 sm:grid-cols-3">
            <Peca titulo="Uma posição, de 1 a 100"
                  texto="Da extrema esquerda à extrema direita, com a conta à mostra — e um segundo número dizendo se ela conta a história toda.">
              <ReguaArte className="w-full" valor={22} />
            </Peca>

            <Peca titulo="Seis eixos, dezoito facetas"
                  texto="Economia, costumes, autoridade, nação, democracia e meio ambiente. Cada um dividido em três, porque é aí que aparece onde você é radical e onde é morno.">
              <EixosArte className="w-full" />
            </Peca>

            <Peca titulo="Seu ponto no mapa"
                  texto="Quinze famílias políticas reais como referência, e você entre elas. Com história, figuras, forças, fraquezas e onde cada uma é forte no mundo.">
              <MapaArte className="h-24 w-full" preencher comEixos />
            </Peca>
          </div>
        </div>
      </section>

      {/* Diferencial metodologico, dito sem jargao. */}
      <section className="mx-auto max-w-6xl px-6 py-20">
        <div className="grid gap-12 lg:grid-cols-2">
          <div>
            <h2 className="subtitulo text-balance text-3xl sm:text-4xl">
              Dois eixos não dão conta de ninguém.
            </h2>
            <p className="mt-6 text-lg leading-relaxed text-grafia">
              A maioria dos testes te encaixa num quadrante: esquerda ou direita,
              autoritário ou libertário. Só que dá para defender o Estado na economia e a
              liberdade nos costumes. Dá para querer mercado livre e mão pesada na
              segurança. Dá para ser radical no que quer mudar e absolutamente legalista
              no como.
            </p>
            <p className="mt-4 text-lg leading-relaxed text-grafia">
              Aqui são seis eixos medidos separadamente — e o resultado mostra, com
              todas as letras, onde você <em>não</em> cabe na caixa que mais se parece
              com você.
            </p>
          </div>

          <dl className="grid grid-cols-2 gap-x-8 gap-y-10 self-center">
            <Numero n={info?.completa?.perguntas ?? '90'} r="perguntas na versão completa" />
            <Numero n="18" r="facetas medidas separadamente" />
            <Numero n="15" r="famílias políticas de referência" />
            <Numero n="±3" r="pontos de margem de erro" />
          </dl>
        </div>
      </section>

      {/* Comunidade. Vem antes da secao de privacidade de proposito: e a
          promessa mais forte da home, e a duvida que ela levanta — "vao ver
          como eu penso?" — e respondida na secao logo abaixo. */}
      <section className="border-t border-borda bg-white">
        <div className="mx-auto max-w-6xl px-6 py-16">
          <div className="grid items-center gap-10 lg:grid-cols-[1.05fr_0.95fr]">
            <div>
              <p className="rotulo">Comunidade</p>
              <h2 className="subtitulo mt-3 text-balance text-3xl sm:text-4xl">
                Veja como a sua gente pensa, num mapa só.
              </h2>
              <p className="mt-4 max-w-xl leading-relaxed text-grafia">
                A família, o escritório, a turma da facul. Você convida, cada pessoa
                responde a sua, e todo mundo aparece no mesmo gráfico — com nome. Não é
                enquete de grupo de WhatsApp: é a posição de cada um, medida do mesmo
                jeito, lado a lado.
              </p>

              {/* O diferencial e o consentimento, e ele e dito como diferencial e
                  nao como letra miuda. */}
              <div className="mt-6 space-y-3">
                {[
                  ['Ninguém entra sem dizer sim', 'O convite explica, antes de qualquer botão, que aceitar coloca sua posição no mapa com o seu nome. Sem aceite, sem ponto.'],
                  ['Dá para sair do mapa e continuar no grupo', 'Você pode estar na comunidade sem aparecer, e voltar atrás quando quiser. É um botão, não um e-mail para o suporte.'],
                  ['Recusar não vira constrangimento', 'Se você não aceitar, quem convidou não é avisado. O convite só deixa de existir.'],
                ].map(([t, d]) => (
                  <div key={t} className="border-l-2 border-tinta pl-4">
                    <p className="text-sm font-semibold">{t}</p>
                    <p className="mt-0.5 text-sm leading-relaxed text-grafia">{d}</p>
                  </div>
                ))}
              </div>

              <Link to="/comunidade" className="botao-forte mt-7 inline-flex">
                Ver como funciona
              </Link>
            </div>

            <div className="cartao overflow-hidden p-5">
              <MapaExemplo />
              <p className="mt-3 text-xs leading-relaxed text-tenue">
                Exemplo. No seu, os nomes são os das pessoas que aceitaram o seu convite.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Privacidade em destaque, nao no rodape: e o que decide se a pessoa
          responde com sinceridade. */}
      <section className="border-t border-borda bg-white">
        <div className="mx-auto max-w-6xl px-6 py-16">
          <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
            <h2 className="subtitulo text-balance text-2xl sm:text-3xl">
              Opinião política é dado sensível. Tratamos como tal.
            </h2>
            <div className="space-y-3 text-grafia">
              <p>
                Você responde sem se identificar. O nome e o e-mail só entram no fim, para
                abrir a conta gratuita onde o resultado fica guardado.
              </p>
              <p>
                Nada entra na base de pesquisa sem você marcar que aceita — separadamente,
                no fim, e só na versão completa.
              </p>
              <p>
                A linha que vai para a pesquisa não guarda ligação com você. Não existe
                caminho de volta, nem para nós. É assim por desenho, não por promessa.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-20 text-center">
        <h2 className="titulo text-3xl sm:text-5xl">Pronto para se conhecer?</h2>
        <button onClick={() => ir('/responder?modo=long')} className="botao-forte mt-8 px-8 py-4 text-base">
          Começar agora
        </button>
      </section>
    </div>
  )
}

const Peca = ({ titulo, texto, children }) => (
  <div>
    {/* overflow-hidden porque o mapa e quadrado e vazava da caixa de altura
        fixa — os pontos apareciam soltos por fora do cartao. */}
    <div className="mb-5 flex h-28 items-center justify-center overflow-hidden rounded-xl border border-borda bg-papel px-5">
      <div className="w-full max-h-24 [&>svg]:max-h-24 [&>svg]:w-full">{children}</div>
    </div>
    <h3 className="font-semibold tracking-apertado">{titulo}</h3>
    <p className="mt-2 text-sm leading-relaxed text-grafia">{texto}</p>
  </div>
)

const Numero = ({ n, r }) => (
  <div>
    <dt className="titulo text-4xl sm:text-5xl tabular-nums">{n}</dt>
    <dd className="mt-1.5 text-sm text-grafia">{r}</dd>
  </div>
)
