import { useEffect, useRef, useState } from 'react'
import { tinta } from '../lib/cor'

// Card 1080x1350 (4:5, o formato que o Instagram menos corta no feed),
// desenhado em canvas no proprio navegador. Sem servidor de imagem: o
// resultado ja esta na tela, gerar fora seria uma round-trip para nada.
const L = 1080, A = 1350

function desenhar(ctx, { posicao, rotulo, familia, tagline, cor, economia, costumes, metodo }) {
  ctx.fillStyle = '#fafafa'; ctx.fillRect(0, 0, L, A)

  // Faixa da cor da familia no topo — a assinatura visual do resultado.
  ctx.fillStyle = cor; ctx.fillRect(0, 0, L, 14)

  ctx.fillStyle = '#5b5f6b'
  ctx.font = '600 26px Inter, system-ui, sans-serif'
  ctx.letterSpacing = '3px'
  ctx.fillText('EU PRESIDENTE', 90, 130)
  ctx.letterSpacing = '0px'

  // O numero e a manchete: e ele que a pessoa manda no grupo.
  ctx.fillStyle = '#0a0a0b'
  ctx.font = '800 250px Inter, system-ui, sans-serif'
  ctx.fillText(String(posicao), 90, 400)

  const larguraNum = ctx.measureText(String(posicao)).width
  ctx.font = '500 54px Inter, system-ui, sans-serif'
  ctx.fillStyle = '#5b5f6b'
  ctx.fillText(rotulo, 90 + larguraNum + 28, 400)

  // Regua de 1 a 100 com a marca da pessoa.
  const rx = 90, ry = 470, rw = L - 180
  ctx.fillStyle = '#e4e4e4'; ctx.fillRect(rx, ry, rw, 16)
  const px = rx + (posicao / 100) * rw
  ctx.fillStyle = cor
  ctx.beginPath(); ctx.arc(px, ry + 8, 22, 0, Math.PI * 2); ctx.fill()
  ctx.strokeStyle = '#fafafa'; ctx.lineWidth = 6; ctx.stroke()

  ctx.font = '400 24px Inter, system-ui, sans-serif'; ctx.fillStyle = '#5b5f6b'
  ctx.fillText('1 · extrema esquerda', rx, ry + 66)
  const dir = 'extrema direita · 100'
  ctx.fillText(dir, rx + rw - ctx.measureText(dir).width, ry + 66)

  // A familia politica.
  ctx.fillStyle = '#0a0a0b'; ctx.font = '600 72px Inter, system-ui, sans-serif'
  ctx.fillText(familia, 90, 660)

  ctx.fillStyle = '#5b5f6b'; ctx.font = '400 34px Inter, system-ui, sans-serif'
  const apos = quebrar(ctx, tagline, 90, 718, L - 180, 46)

  // O metodo e o que o card tem de mais distintivo: diz que radical no
  // conteudo e extremista no metodo sao coisas diferentes. Entra logo abaixo
  // da tagline, e nao numa posicao fixa, para nao abrir buraco no meio.
  let y = apos + 54
  if (metodo) {
    ctx.fillStyle = cor; ctx.fillRect(90, y - 26, 5, 40)
    ctx.fillStyle = '#0a0a0b'; ctx.font = '600 30px Inter, system-ui, sans-serif'
    quebrar(ctx, metodo, 112, y, L - 210, 40)
    y += 70
  }

  // Os dois eixos que formam o numero: sem eles o card e so um rotulo.
  barra(ctx, 'Economia', economia, 90, Math.max(y + 60, 900), cor)
  barra(ctx, 'Costumes', costumes, 90, Math.max(y + 220, 1060), cor)

  ctx.fillStyle = '#5b5f6b'; ctx.font = '400 28px Inter, system-ui, sans-serif'
  ctx.fillText('eupresidente.netlify.app', 90, A - 80)
}

function barra(ctx, titulo, valor, x, y, cor) {
  const w = L - 180
  ctx.fillStyle = '#0a0a0b'; ctx.font = '600 30px Inter, system-ui, sans-serif'
  ctx.fillText(titulo, x, y)
  ctx.fillStyle = '#5b5f6b'; ctx.font = '400 30px Inter, system-ui, sans-serif'
  const n = String(valor); ctx.fillText(n, x + w - ctx.measureText(n).width, y)
  ctx.fillStyle = '#e4e4e4'; ctx.fillRect(x, y + 22, w, 12)
  ctx.fillStyle = cor
  ctx.fillRect(x + (valor / 100) * w - 4, y + 14, 8, 28)
}

// Devolve o y da ultima linha, para o proximo bloco encostar nele em vez de
// ficar numa posicao fixa que abre buraco quando o texto e curto.
function quebrar(ctx, texto, x, y, largura, alturaLinha) {
  const palavras = String(texto ?? '').split(' ')
  let linha = '', ly = y
  for (const p of palavras) {
    const teste = linha ? `${linha} ${p}` : p
    if (ctx.measureText(teste).width > largura && linha) {
      ctx.fillText(linha, x, ly); linha = p; ly += alturaLinha
    } else linha = teste
  }
  if (linha) ctx.fillText(linha, x, ly)
  return ly
}

export default function Compartilhar({ posicao, familia }) {
  const ref = useRef(null)
  const [url, setUrl] = useState(null)
  const [blob, setBlob] = useState(null)
  const [aviso, setAviso] = useState(null)

  const dados = {
    posicao: posicao?.posicao ?? 50,
    rotulo: posicao?.rotulo ?? '',
    familia: familia?.name ?? '',
    tagline: familia?.tagline ?? '',
    cor: tinta(familia?.color),
    economia: posicao?.economia_1_100 ?? 50,
    costumes: posicao?.costumes_1_100 ?? 50,
    metodo: posicao?.metodo?.rotulo ?? null,
  }

  // Desenha assim que a secao monta: a pessoa ve o card pronto, sem precisar
  // clicar em "gerar" para descobrir o que vai sair.
  useEffect(() => {
    const canvas = ref.current
    if (!canvas || !familia) return
    canvas.width = L; canvas.height = A
    desenhar(canvas.getContext('2d'), dados)
    canvas.toBlob(b => {
      if (!b) return
      setBlob(b)
      setUrl(u => { if (u) URL.revokeObjectURL(u); return URL.createObjectURL(b) })
    }, 'image/png')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [familia?.id, posicao?.posicao])

  useEffect(() => () => { if (url) URL.revokeObjectURL(url) }, [url])

  function baixar() {
    if (!url) return
    const a = document.createElement('a')
    a.href = url; a.download = 'eu-presidente.png'; a.click()
    setAviso('Imagem salva.')
  }

  // Instagram nao publica pela web — so pelo app. No celular a Web Share API
  // entrega o arquivo para o app; no computador nao existe caminho, entao a
  // unica coisa honesta e salvar e dizer isso.
  async function paraInstagram() {
    if (!blob) return
    const arquivo = new File([blob], 'eu-presidente.png', { type: 'image/png' })
    if (navigator.canShare?.({ files: [arquivo] })) {
      try { await navigator.share({ files: [arquivo] }) } catch { /* cancelou */ }
      return
    }
    baixar()
    setAviso('Imagem salva. O Instagram só publica pelo aplicativo — suba de lá.')
  }

  // O X abre o compositor com texto e link, mas nao aceita imagem por URL.
  // Entao copiamos a imagem para a area de transferencia e a pessoa cola.
  async function paraX() {
    const texto = `Meu posicionamento político deu ${dados.posicao} de 100 — ${dados.rotulo}. Família: ${dados.familia}.`
    let copiou = false
    try {
      if (blob && navigator.clipboard?.write) {
        await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])
        copiou = true
      }
    } catch { /* navegador sem suporte */ }

    window.open(
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(texto)}&url=${encodeURIComponent(window.location.href)}`,
      '_blank', 'noopener')
    setAviso(copiou
      ? 'Imagem copiada — é só colar no post que abriu.'
      : 'Post aberto. Salve a imagem e anexe manualmente.')
  }

  async function copiarLink() {
    await navigator.clipboard.writeText(window.location.href)
    setAviso('Link copiado.')
  }

  return (
    <div>
      <div className="grid gap-6 sm:grid-cols-[minmax(0,320px)_1fr] sm:items-start">
        <div className="overflow-hidden rounded-xl border border-borda bg-white">
          {/* O proprio canvas e a previa: nada de imagem intermediaria que
              possa divergir do arquivo que a pessoa vai salvar. */}
          <canvas ref={ref} className="block w-full" style={{ aspectRatio: `${L}/${A}` }} />
        </div>

        <div>
          <h3 className="subtitulo text-xl">Mostre para alguém</h3>
          <p className="mt-1.5 text-sm leading-relaxed text-grafia">
            A imagem sai no formato do feed, com seu número, os dois eixos que o formam
            e o seu método.
          </p>

          <div className="mt-5 flex flex-wrap gap-2">
            <button onClick={baixar} className="botao-forte">Salvar imagem</button>
            <button onClick={paraInstagram} className="botao-leve">Instagram</button>
            <button onClick={paraX} className="botao-leve">X</button>
            <button onClick={copiarLink} className="botao-leve">Copiar link</button>
          </div>

          {aviso && <p className="mt-3 text-xs text-grafia">{aviso}</p>}

          <p className="mt-4 text-xs leading-relaxed text-tenue">
            Quem abrir o link vê seu resultado inteiro — o link é a credencial. Mande
            para quem você quer que veja.
          </p>
        </div>
      </div>
    </div>
  )
}
