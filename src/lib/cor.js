// As familias sao cinzas ordenados pela posicao no espectro (o mais a esquerda
// e o mais escuro). O ordenamento carrega informacao, mas as pontas claras —
// um libertario em #c0c0c0 — somem sobre o papel: 1,9:1 de contraste, abaixo
// de qualquer minimo legivel.
//
// A saida aqui comprime a rampa inteira para dentro da faixa legivel em vez de
// escurecer so quem falha. Comprimir preserva a ordem e os intervalos entre as
// familias; corrigir caso a caso embaralharia os vizinhos, e duas familias
// diferentes acabariam no mesmo tom — ou na ordem trocada.
const TETO = 110 // #6e6e6e sobre #fafafa da ~4,9:1

export function tinta(cor) {
  const h = String(cor ?? '').replace('#', '')
  if (h.length !== 6) return '#12141a'
  const n = parseInt(h, 16)
  if (Number.isNaN(n)) return '#12141a'

  // Um unico fator para os tres canais: escurece sem torcer o matiz, e o mesmo
  // fator para todas as cores, entao a ordem entre elas nao muda.
  const fator = TETO / 255
  return (
    '#' +
    [(n >> 16) & 255, (n >> 8) & 255, n & 255]
      .map((v) => Math.round(v * fator).toString(16).padStart(2, '0'))
      .join('')
  )
}
