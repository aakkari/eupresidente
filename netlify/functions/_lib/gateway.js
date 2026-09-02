// A camada de pagamento, isolada num arquivo so.
//
// O gateway ainda nao foi escolhido. Em vez de deixar a assinatura inteira
// esperando por essa decisao, o resto do sistema — trava paga, historico,
// cancelamento, tela da conta — funciona por cima desta interface, e o dia em
// que o Stripe ou o Mercado Pago entrar, entra aqui e em mais lugar nenhum.
//
// Enquanto isso existe o gateway 'manual': o admin concede a assinatura na
// mao. Nao e um remendo para fingir que funciona — e como comps, cortesias e
// testes vao continuar sendo feitos depois que o gateway real existir.

export const GATEWAYS = ['manual', 'stripe', 'mercadopago']

// Um gateway so esta disponivel se as credenciais dele existirem. Sem isso a
// tela ofereceria um botao que leva a um erro.
export function disponiveis() {
  const lista = ['manual']
  if (process.env.STRIPE_SECRET_KEY) lista.push('stripe')
  if (process.env.MERCADOPAGO_ACCESS_TOKEN) lista.push('mercadopago')
  return lista
}

export function podeCobrar(gateway) {
  return gateway !== 'manual' && disponiveis().includes(gateway)
}

// Cria a cobranca e devolve a URL para onde mandar a pessoa.
export async function criarCheckout({ gateway }) {
  if (!podeCobrar(gateway)) {
    const e = new Error('cobranca ainda nao esta configurada')
    e.status = 503
    throw e
  }
  // Stripe e Mercado Pago entram aqui quando as chaves existirem. Deixar a
  // funcao explodir e melhor do que devolver uma URL falsa: um checkout que
  // nao cobra e pior do que um botao que avisa.
  const e = new Error(`gateway ${gateway} sem implementacao`)
  e.status = 501
  throw e
}

export async function cancelarNoGateway({ gateway }) {
  // Cancelamento manual nao precisa falar com ninguem: a data de fim ja esta
  // gravada, e cancelar e so nao renovar.
  if (gateway === 'manual' || !gateway) return { ok: true }
  if (!podeCobrar(gateway)) return { ok: true }
  const e = new Error(`gateway ${gateway} sem implementacao`)
  e.status = 501
  throw e
}
