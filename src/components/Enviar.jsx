import { useState } from 'react'

// Enviar o resultado para alguem.
//
// O link e a credencial: quem tem, abre. Mas quem abre entra como visitante,
// entao ve o mesmo que qualquer pessoa sem conta veria — nao o report inteiro.
// O texto abaixo diz isso, porque prometer o contrario transforma um convite
// em decepcao na casa do outro.
//
// Sem o botao de compartilhamento nativo do celular: ele so aparecia em alguns
// aparelhos, abria uma folha do sistema com dezenas de icones, e deixava tres
// caminhos claros competindo com um caminho vago. WhatsApp, e-mail e copiar
// cobrem o que as pessoas de fato usam.
export default function Enviar({ link, familia, posicao, rotulo, compacto = false }) {
  const [aviso, setAviso] = useState(null)

  const texto = familia
    ? `Fiz o Eu Presidente: deu ${posicao} de 100${rotulo ? ` — ${rotulo}` : ''}, família ${familia}. Faz o seu e compara comigo:`
    : 'Fiz o Eu Presidente. Faz o seu e compara comigo:'

  const whatsapp = `https://wa.me/?text=${encodeURIComponent(`${texto} ${link}`)}`
  const email = `mailto:?subject=${encodeURIComponent('Meu resultado no Eu Presidente')}` +
                `&body=${encodeURIComponent(`${texto}\n\n${link}`)}`

  async function copiar() {
    try {
      await navigator.clipboard.writeText(link)
      setAviso('Link copiado.')
    } catch {
      setAviso(link)
    }
  }

  return (
    <div>
      <div className={`flex flex-wrap gap-2 ${compacto ? 'text-sm' : ''}`}>
        <a href={whatsapp} target="_blank" rel="noopener noreferrer"
           className="botao-forte">WhatsApp</a>
        <a href={email} className="botao-leve">E-mail</a>
        <button onClick={copiar} className="botao-leve">Copiar link</button>
      </div>

      {aviso && <p className="mt-2 break-all text-xs text-grafia">{aviso}</p>}

      {/* So quando o link e de um resultado. No convite para responder, o link
          e o do site: dizer "quem abrir ve sua posicao e sua familia" ali
          seria descrever uma coisa que nao vai acontecer. */}
      {!compacto && familia && (
        <p className="mt-3 text-xs leading-relaxed text-tenue">
          Quem abrir o link entra como visitante: vê sua posição, sua família e seu mapa,
          e o resto só se criar a conta. O link é a credencial — mande para quem você
          quer que veja.
        </p>
      )}
    </div>
  )
}
