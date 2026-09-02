import { exigirUsuario } from './_lib/auth.js'
import { json, erro, protegido } from './_lib/http.js'
import { configuracao, nivelDoUsuario, PADRAO_ASSINATURA } from './_lib/plano.js'
import { criarCheckout, cancelarNoGateway, podeCobrar } from './_lib/gateway.js'

// Estado da assinatura, inicio da cobranca e cancelamento.
export default protegido(async (req) => {
  const auth = await exigirUsuario(req)
  if (!auth.ok) return erro(auth.motivo, 401)
  const { sb, uid } = auth

  // Com padrao: se a linha de configuracao sumir, a tela mostra um plano
  // coerente e desligado em vez de "R$ NaN".
  const plano = await configuracao(sb, 'assinatura', PADRAO_ASSINATURA)

  if (req.method === 'GET') {
    const [{ data: assinatura }, { data: pagamentos }, nivel] = await Promise.all([
      sb.from('subscriptions')
        .select('status, gateway, period_start, period_end, cancel_at_period_end')
        .eq('user_id', uid).maybeSingle(),
      sb.from('payments')
        .select('amount_cents, currency, status, method, receipt_url, paid_at, created_at')
        .eq('user_id', uid).order('created_at', { ascending: false }).limit(50),
      nivelDoUsuario(sb, uid),
    ])

    return json({
      nivel,
      assinatura: assinatura ?? { status: 'nenhuma' },
      pagamentos: pagamentos ?? [],
      plano: {
        titulo: plano.titulo, descricao: plano.descricao,
        preco_centavos: plano.preco_centavos, moeda: plano.moeda, ciclo: plano.ciclo,
        // A venda so aparece quando esta ligada no admin E existe gateway para
        // cobrar. Ligar no admin sem chave nenhuma nao pode abrir a loja.
        a_venda: Boolean(plano.ativa) && podeCobrar(plano.gateway),
      },
    })
  }

  if (req.method === 'POST') {
    if (!plano.ativa) return erro('assinatura nao esta a venda', 409)
    const { url } = await criarCheckout({
      gateway: plano.gateway, uid, email: auth.user.email,
      precoCentavos: plano.preco_centavos, moeda: plano.moeda,
    })
    return json({ url })
  }

  if (req.method === 'DELETE') {
    const { data: assinatura } = await sb.from('subscriptions')
      .select('gateway, status, period_end').eq('user_id', uid).maybeSingle()
    if (!assinatura || assinatura.status === 'nenhuma') return erro('nao ha assinatura', 404)

    await cancelarNoGateway({ gateway: assinatura.gateway })

    // Cancelar nao tira o acesso na hora: quem pagou o ano tem o ano. O que
    // muda e que nao renova.
    const { error } = await sb.from('subscriptions').update({
      status: 'cancelada', cancel_at_period_end: true, updated_at: new Date().toISOString(),
    }).eq('user_id', uid)
    if (error) return erro(error.message, 400)

    return json({ ok: true, vale_ate: assinatura.period_end })
  }

  return erro('metodo nao permitido', 405)
})
