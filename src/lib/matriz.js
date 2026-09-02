// Geometria e rotulagem do mapa politico, compartilhadas entre a matriz do
// report (15 familias) e o mapa da comunidade (pessoas com nome).
//
// A anticolisao de rotulos e a parte dificil e a que nao pode divergir: se os
// dois mapas empurrassem nomes com regras diferentes, um deles ficaria com
// texto sobreposto sem ninguem perceber ate ver a tela.

// Vistas do mesmo resultado. Um quadrante so nunca da conta de seis eixos —
// trocar os eixos e o que permite ver combinacoes que o mapa classico esconde.
export const VISTAS = [
  { id: 'classico', nome: 'Economia × Autoridade',
    x: { eixo: 'ECO', esq: 'Estado coordena', dir: 'Mercado coordena' },
    y: { eixo: 'AUT', baixo: 'Liberdade civil', cima: 'Ordem e coerção' },
    cantos: ['Esquerda autoritária', 'Direita autoritária', 'Esquerda libertária', 'Direita libertária'] },
  { id: 'costumes', nome: 'Economia × Costumes',
    x: { eixo: 'ECO', esq: 'Estado coordena', dir: 'Mercado coordena' },
    y: { eixo: 'SOC', baixo: 'Autonomia individual', cima: 'Tradição preserva', inverter: true },
    cantos: ['Estatista conservador', 'Liberal conservador', 'Estatista progressista', 'Liberal progressista'] },
  { id: 'brasil', nome: 'Nação × Democracia',
    x: { eixo: 'NAC', esq: 'Integração global', dir: 'Soberania nacional' },
    y: { eixo: 'DEM', baixo: 'Instituições e freios', cima: 'Vontade popular direta' },
    cantos: ['Populista global', 'Populista nacional', 'Institucional global', 'Institucional nacional'] },
]

export const caixa = ({ W, H, L = 40, R = 20, T = 20, B = 40 }) => ({
  W, H, L, R, T, B,
  px: v => L + ((v + 1) / 2) * (W - L - R),
  py: (v, inv) => T + ((1 - (inv ? -v : v)) / 2) * (H - T - B),
})

// Coloca os rotulos sem que eles se sobreponham.
//
// Rotulo do lado de dentro: na metade direita o texto vai para a esquerda do
// ponto, senao vaza da caixa e o nome sai cortado. Depois, anticolisao: dois
// rotulos proximos demais viram borrao, e o de baixo desce ate sair da frente.
// Os nomes dos quadrantes entram como obstaculos fixos — sem isso um rotulo cai
// em cima deles e os dois ficam ilegiveis.
export function distribuirRotulos(pontos, { c, cantos = [], alturaLinha = 11, larguraTexto = 95 }) {
  const colocados = cantos.map((_, i) => ({
    x: i % 2 ? c.W - c.R - 60 : c.L + 60,
    ly: i < 2 ? c.T + 14 : c.H - c.B - 7,
    aDireita: Boolean(i % 2),
  }))

  const piso = c.H - c.B - 4

  for (const p of [...pontos].sort((a, b) => a.y - b.y)) {
    p.aDireita = p.x > c.L + (c.W - c.L - c.R) * 0.62
    // Tenta descer; se o rotulo sair da caixa e cair na faixa dos eixos, tenta
    // subir a partir do ponto. Quem esta no canto de baixo so tem um lado.
    p.ly = empurrar(p, colocados, p.y + 3, +alturaLinha, larguraTexto)
    if (p.ly > piso) p.ly = empurrar(p, colocados, p.y + 3, -alturaLinha, larguraTexto)
    colocados.push(p)
  }
  return pontos
}

function empurrar(p, colocados, inicio, passo, larguraTexto) {
  let ly = inicio, mexeu = true, voltas = 0
  while (mexeu && voltas++ < 12) {
    mexeu = false
    for (const q of colocados) {
      if (q.aDireita !== p.aDireita) continue
      if (Math.abs(q.ly - ly) < Math.abs(passo) && Math.abs(q.x - p.x) < larguraTexto) {
        ly += passo; mexeu = true
      }
    }
  }
  return ly
}

// Verdadeiro quando o rotulo foi empurrado para longe do ponto e precisa de
// linha guia para nao parecer nome solto.
export const afastado = (p) => Math.abs(p.ly - p.y - 3) > 4
