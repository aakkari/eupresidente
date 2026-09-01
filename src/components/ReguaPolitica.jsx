const FAIXAS = [
  { ate: 13,  nome: 'Extrema esquerda' },
  { ate: 28,  nome: 'Esquerda' },
  { ate: 43,  nome: 'Centro-esquerda' },
  { ate: 58,  nome: 'Centro' },
  { ate: 73,  nome: 'Centro-direita' },
  { ate: 88,  nome: 'Direita' },
  { ate: 101, nome: 'Extrema direita' },
]

// Régua de 1 a 100 com o ponto da pessoa. As faixas aparecem como divisões
// para dar noção de escala — sem elas o número flutua sem referência.
export default function ReguaPolitica({ posicao }) {
  if (!posicao) return null
  const { posicao: n, rotulo, economia_1_100, costumes_1_100, dispersao, cruzado, metodo } = posicao

  return (
    <section className="cartao p-6">
      <p className="rotulo">Sua posição</p>

      <div className="mt-2 flex items-baseline gap-3">
        <span className="font-serif text-6xl tabular-nums leading-none">{n}</span>
        <span className="font-serif text-2xl">{rotulo}</span>
      </div>

      <div className="relative mt-8 mb-2">
        <div className="flex h-3 overflow-hidden rounded">
          {FAIXAS.map((f, i) => (
            <div key={f.nome} title={f.nome}
                 className={`h-3 ${i % 2 ? 'bg-borda' : 'bg-grafia/30'}`}
                 style={{ width: `${(f.ate - (FAIXAS[i - 1]?.ate ?? 1))}%` }} />
          ))}
        </div>
        <div className="absolute -top-1.5 -translate-x-1/2" style={{ left: `${n}%` }}>
          <div className="h-6 w-1 rounded-full bg-tinta ring-4 ring-papel" />
        </div>
      </div>

      <div className="flex justify-between text-[11px] text-grafia">
        <span>1 · extrema esquerda</span>
        <span>50 · centro</span>
        <span>extrema direita · 100</span>
      </div>

      {/* Os dois eixos que compõem o número. Sem isso, o 1-100 é uma caixa
          preta — e quem discorda do resultado não tem onde olhar. */}
      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <Componente titulo="Posicionamento econômico" valor={economia_1_100}
                    esq="Estado coordena" dir="Mercado coordena" />
        <Componente titulo="Posicionamento nos costumes" valor={costumes_1_100}
                    esq="Progressista" dir="Conservador" />
      </div>

      {cruzado && (
        <p className="mt-5 rounded-md border border-tinta/20 bg-papel p-3 text-sm leading-relaxed">
          <strong>Esse número esconde alguma coisa.</strong> Você está em {economia_1_100} na
          economia e {costumes_1_100} nos costumes — lados diferentes. O {n} é a média, e
          média de lados opostos cai no meio sem que você esteja no meio de nada.
          Os dois números acima dizem mais sobre você do que o {n}.
        </p>
      )}

      {metodo && (
        <p className="mt-4 text-sm leading-relaxed text-grafia">
          <span className="rotulo">Método</span><br />
          <strong className="text-tinta">{metodo.rotulo}.</strong> {metodo.texto}
          {' '}Isso é independente de ser de esquerda ou de direita: dá para querer mudança
          radical respeitando as regras, e dá para ser moderado e disposto a atropelá-las.
        </p>
      )}
    </section>
  )
}

const Componente = ({ titulo, valor, esq, dir }) => (
  <div>
    <div className="flex items-baseline justify-between">
      <span className="text-xs font-medium">{titulo}</span>
      <span className="text-sm tabular-nums text-grafia">{valor}</span>
    </div>
    <div className="relative mt-1 h-2 rounded bg-borda">
      <div className="absolute -top-0.5 h-3 w-0.5 -translate-x-1/2 rounded bg-tinta"
           style={{ left: `${valor}%` }} />
    </div>
    <div className="mt-1 flex justify-between text-[10px] text-grafia">
      <span>{esq}</span><span>{dir}</span>
    </div>
  </div>
)
