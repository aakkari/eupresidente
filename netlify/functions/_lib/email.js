// Envio de email, isolado num arquivo so — mesmo desenho do gateway.
//
// Sem provedor configurado, nada e enviado e a Function devolve o link para a
// propria pessoa mandar por WhatsApp ou pelo email dela. Isso nao e um
// consolo: convite que chega pelo WhatsApp de quem convidou tem mais chance de
// ser aceito do que email de remetente desconhecido. Quando a chave existir, o
// email passa a sair tambem, e o link continua aparecendo.

const DE = process.env.EMAIL_REMETENTE || 'Eu Presidente <onboarding@resend.dev>'

export const podeEnviar = () => Boolean(process.env.RESEND_API_KEY)

export async function enviarConvite({ para, comunidade, convidadoPor, link }) {
  if (!podeEnviar()) return { enviado: false, motivo: 'sem provedor de email' }

  const assunto = `${convidadoPor} convidou você para a comunidade ${comunidade}`
  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({ from: DE, to: [para], subject: assunto,
                           html: corpo({ comunidade, convidadoPor, link }) }),
  })

  if (!r.ok) {
    // Falha de envio nao derruba o convite: ele ja existe no banco e o link
    // funciona. Quem convidou recebe o link na tela e manda do jeito que
    // quiser.
    const detalhe = await r.text().catch(() => '')
    console.error('resend falhou:', r.status, detalhe.slice(0, 300))
    return { enviado: false, motivo: `provedor respondeu ${r.status}` }
  }
  return { enviado: true }
}

// HTML simples de proposito: cliente de email nao e navegador, e o que precisa
// chegar inteiro e o que a pessoa esta aceitando.
const corpo = ({ comunidade, convidadoPor, link }) => `
<div style="font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#12141a">
  <p style="font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#5b5f6b;margin:0">Eu Presidente</p>
  <h1 style="font-size:22px;line-height:1.25;margin:12px 0 0">
    ${escapar(convidadoPor)} convidou você para a comunidade ${escapar(comunidade)}.
  </h1>
  <p style="font-size:15px;line-height:1.6;color:#3d4049">
    É um grupo onde cada pessoa vê a posição política das outras num mapa, com nome.
    Você só entra se aceitar, e ao aceitar está concordando em dividir a sua posição
    com quem está lá — e vendo a de todos eles.
  </p>
  <p style="margin:24px 0">
    <a href="${link}" style="background:#12141a;color:#fafafa;text-decoration:none;padding:12px 22px;border-radius:999px;font-size:15px;display:inline-block">
      Ver o convite
    </a>
  </p>
  <p style="font-size:13px;line-height:1.6;color:#5b5f6b">
    Se não quiser, é só ignorar este email — ninguém é avisado, e nada seu é compartilhado.
  </p>
</div>`

const escapar = (s) => String(s ?? '').replace(/[<>&"]/g,
  c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[c]))
