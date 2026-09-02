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
        // A venda abre quando esta ligada no admin E existe por onde pagar —
        // um gateway com chave, ou um link de pagamento pronto. Ligar sem
        // nenhum dos dois nao pode abrir a loja.
        a_venda: Boolean(plano.ativa) && (podeCobrar(plano.gateway) || Boolean(plano.link_pagamento)),
        // Por link, o acesso nao e automatico: alguem libera no admin depois
        // que o pagamento cai. A tela precisa saber para dizer a verdade em
        // vez de prometer liberacao na hora.
        manual: !podeCobrar(plano.gateway) && Boolean(plano.link_pagamento),
      },
    })
  }

  if (req.method === 'POST') {
    if (!plano.ativa) return erro('assinatura nao esta a venda', 409)

    if (podeCobrar(plano.gateway)) {
      const { url } = await criarCheckout({
        gateway: plano.gateway, uid, email: auth.user.email,
        precoCentavos: plano.preco_centavos, moeda: plano.moeda,
      })
      return json({ url })
    }

    if (!plano.link_pagamento) return erro('nao ha meio de pagamento configurado', 503)

    // Registra a intencao antes de mandar para o link. Sem isso, quem paga
    // some do nosso lado ate aparecer no extrato do gateway — e o admin fica
    // sem saber quem esta esperando liberacao.
    //
    // Uma linha pendente por vez: clicar tres vezes no botao nao pode virar
    // tres cobrancas na fila do admin.
    const { data: jaTem } = await sb.from('payments')
      .select('id').eq('user_id', uid).eq('status', 'pendente').limit(1).maybeSingle()

    if (!jaTem) {
      await sb.from('payments').insert({
        user_id: uid, amount_cents: plano.preco_centavos, currency: plano.moeda || 'BRL',
        status: 'pendente', gateway: 'link', method: 'link de pagamento',
      })
    }

    return json({ url: plano.link_pagamento, manual: true })
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
