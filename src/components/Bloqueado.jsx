import { Link } from 'react-router-dom'

// Trava o resto do relatorio atras do cadastro, deixando ver o que ha por
// baixo. O desfoque e a parte importante: dizer "tem mais" nao convence
// ninguem; ver o que se esta perdendo, sim.
//
// O que fica livre e o que a pessoa precisa para se reconhecer e compartilhar
// — posicao, familia e mapa. O que fica atras e o aprofundamento. Travar o
// resultado inteiro seria pedir cadastro por nada.
export default function Bloqueado({ token, itens = [], children }) {
  return (
    <div className="relative">
      <div aria-hidden="true" className="pointer-events-none select-none blur-[6px] saturate-0 opacity-55">
        {children}
      </div>

      <div className="absolute inset-x-0 top-0 h-full bg-gradient-to-b from-papel/10 via-papel/80 to-papel" />

      <div className="absolute inset-x-0 top-16 flex justify-center px-4">
        <div className="cartao w-full max-w-md p-7 text-center shadow-[0_4px_40px_rgba(0,0,0,0.06)]">
          <p className="rotulo">Continua</p>
          <h3 className="subtitulo mt-3 text-2xl text-balance">
            Faça seu cadastro e veja {itens.length} partes a mais do seu perfil.
          </h3>

          <ul className="mt-5 space-y-2 text-left text-sm text-grafia">
            {itens.map(i => (
              <li key={i} className="flex gap-2.5">
                <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-tinta" />
                {i}
              </li>
            ))}
          </ul>

          <Link to={`/entrar?token=${token}`} className="botao-forte mt-6 w-full">
            Criar conta e ver tudo
          </Link>

          <p className="mt-3 text-xs text-tenue">
            É gratuito. Seu resultado fica guardado e você pode comparar depois.
          </p>
        </div>
      </div>
    </div>
  )
}
