import { Link } from 'react-router-dom'

// O que a pessoa ainda nao pode ver.
//
// Antes isto desfocava o conteudo real. Parecia uma fechadura e nao era: o
// texto chegava inteiro no navegador e bastava abrir o inspetor. Agora o
// servidor nao manda o bloco travado, e o que aparece por baixo do cartao e um
// esqueleto — a forma do que existe ali, sem o conteudo.
//
// A forma continua importando. Dizer "tem mais" nao convence ninguem; ver o
// tamanho do que se esta perdendo, sim.
export default function Bloqueado({ trava, token, precoFormatado }) {
  if (!trava?.blocos?.length) return null

  const paraAssinar = trava.proximo_nivel === 'assinante'
  const quantas = trava.blocos.length

  // Grid com tudo na mesma celula, e nao posicao absoluta: absoluto nao ocupa
  // altura, entao quando sobrava pouco bloqueado o esqueleto encolhia e o
  // cartao passava por cima da secao seguinte. Empilhado assim, a secao cresce
  // ate o maior dos dois.
  return (
    <section className="isolate grid [&>*]:col-start-1 [&>*]:row-start-1">
      <Esqueleto blocos={quantas} />

      <div className="relative z-10 bg-gradient-to-b from-papel/10 via-papel/85 to-papel" />

      <div className="relative z-20 flex justify-center px-4 pb-8 pt-12">
        <div className="cartao h-fit w-full max-w-md p-7 text-center shadow-[0_4px_40px_rgba(0,0,0,0.06)]">
          <p className="rotulo">Continua</p>
          <h3 className="subtitulo mt-3 text-2xl text-balance">
            {paraAssinar
              ? `Assine e veja ${quantas} ${quantas === 1 ? 'parte' : 'partes'} a mais do seu perfil.`
              : `Faça seu cadastro e veja ${quantas} ${quantas === 1 ? 'parte' : 'partes'} a mais do seu perfil.`}
          </h3>

          <ul className="mt-5 space-y-2 text-left text-sm text-grafia">
            {trava.blocos.map(b => (
              <li key={b.id} className="flex gap-2.5">
                <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-tinta" />
                <span>{b.promessa}</span>
              </li>
            ))}
          </ul>

          {paraAssinar ? (
            <>
              <Link to="/conta#assinatura" className="botao-forte mt-6 w-full">
                {trava.assinatura_ativa ? 'Ver a assinatura' : 'Ver o que inclui'}
              </Link>
              <p className="mt-3 text-xs text-tenue">
                {precoFormatado
                  ? `${precoFormatado} por ano. Sua posição, seu mapa e suas facetas continuam abertos — o que a assinatura abre é a análise escrita.`
                  : 'Sua posição, seu mapa e suas facetas continuam abertos — o que a assinatura abre é a análise escrita.'}
              </p>
            </>
          ) : (
            <>
              <Link to={`/entrar?token=${token}`} className="botao-forte mt-6 w-full">
                Criar conta e ver tudo
              </Link>
              <p className="mt-3 text-xs text-tenue">
                É gratuito. Seu resultado fica guardado e você pode comparar depois.
              </p>
            </>
          )}
        </div>
      </div>
    </section>
  )
}

// Barras cinzas na forma do que existe atras: um titulo, um paragrafo, uma
// grade de cartoes.
//
// A altura acompanha quantas partes estao travadas. Fixa em dois grupos, ela
// abria um vazio de meia tela quando faltava so um bloco — e o esqueleto
// passava a sugerir mais conteudo do que existe, que e a mesma mentira do
// borrao, ao contrario.
function Esqueleto({ blocos = 1 }) {
  const grupos = Math.min(3, Math.max(1, Math.ceil(blocos / 3)))
  return (
    <div aria-hidden="true" className="select-none space-y-10 opacity-60">
      {Array.from({ length: grupos }, (_, bloco) => (
        <div key={bloco}>
          <Barra className="h-6 w-56" />
          <div className="mt-4 space-y-2.5">
            {['w-full', 'w-full', 'w-[92%]', 'w-[70%]'].map((w, i) => (
              <Barra key={i} className={`h-3 ${w}`} />
            ))}
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {[0, 1].map(i => (
              <div key={i} className="cartao space-y-2.5 p-4">
                <Barra className="h-3.5 w-1/2" />
                <Barra className="h-2.5 w-full" />
                <Barra className="h-2.5 w-[85%]" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

const Barra = ({ className = '' }) => (
  <div className={`rounded bg-tinta/[0.09] ${className}`} />
)
