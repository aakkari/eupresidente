// Quem ve o que, e por quanto.
//
// Duas regras moram aqui e em nenhum outro lugar:
//
// 1. So conteudo editorial e travavel. Posicao, vetor, mapa, facetas e tensoes
//    saem sempre, para qualquer pessoa: sao resposta dela. Cobrar de alguem
//    para ver o proprio dado e o que a LGPD art. 18 chama de direito de
//    acesso — nao e um produto, e uma obrigacao.
//
// 2. A trava e do servidor. A versao anterior mandava o report inteiro e
//    borrava no CSS: quem abrisse o devtools lia tudo. Um borrao nao e uma
//    fechadura. Agora o campo bloqueado nao entra na resposta.

// Os blocos que podem ser travados, na ordem em que aparecem no report. O
// rotulo e a promessa aparecem para a pessoa no cartao da trava e para voce na
// tela do admin — e por isso que moram juntos com a regra, e nao no front.
export const BLOCOS = [
  { id: 'descricao',    campos: ['description'],              rotulo: 'O que isso quer dizer',
    promessa: 'A leitura da sua família política em texto corrido' },
  { id: 'historia',     campos: ['history'],                  rotulo: 'De onde vem',
    promessa: 'A história da sua família política, de onde ela nasceu e como chegou até aqui' },
  { id: 'curiosidades', campos: ['curiosities'],              rotulo: 'Coisas que quase ninguém sabe',
    promessa: 'Curiosidades sobre a tradição' },
  { id: 'figuras',      campos: ['figures'],                  rotulo: 'Quem carregou isso',
    promessa: 'As figuras históricas da tradição' },
  { id: 'forcas',       campos: ['strengths', 'weaknesses'],  rotulo: 'Forças e fraquezas',
    promessa: 'Forças e fraquezas do seu perfil, incluindo as críticas que ele recebe dos próprios aliados' },
  { id: 'ponto_cego',   campos: ['blind_spots'],              rotulo: 'O ponto cego',
    promessa: 'O ponto cego: onde essa tradição historicamente não enxerga' },
  { id: 'paises',       campos: ['countries'],                rotulo: 'No mundo',
    promessa: 'Onde seu perfil é forte no mundo' },
]

// Uma escada so, com dois nomes para o degrau de baixo: do lado da pessoa ele
// se chama 'anonimo' (quem ela e), do lado da configuracao se chama 'todos'
// (quem pode ver). Sao o mesmo degrau, e comparar um com o outro e justamente
// o que a trava faz.
const NIVEIS = { anonimo: 0, todos: 0, cadastrado: 1, assinante: 2 }

export const PADRAO_TRAVAS = Object.fromEntries(BLOCOS.map(b => [b.id, 'cadastrado']))

// Recursos que nao sao blocos do report, mas tambem tem dono. Mesma escada:
// 'todos', 'cadastrado' ou 'assinante'.
//
// Criar comunidade e pago; entrar numa comunidade a convite e de graca, e essa
// assimetria e proposital. Se aceitar convite tambem custasse, o convite
// morreria na caixa de entrada — e e justamente o amigo que entra sem pagar,
// ve o mapa e quer o proprio que compra a anuidade seguinte.
export const RECURSOS = [
  { id: 'criar_comunidade', rotulo: 'Criar comunidade',
    promessa: 'Criar sua própria comunidade e convidar quem você quiser' },
]

export const PADRAO_RECURSOS = { criar_comunidade: 'assinante' }

export function podeUsar(recurso, recursos, nivel) {
  const NIVEIS = { anonimo: 0, todos: 0, cadastrado: 1, assinante: 2 }
  const exigido = NIVEIS[recursos?.[recurso]] ?? NIVEIS[PADRAO_RECURSOS[recurso]] ?? 2
  return (NIVEIS[nivel] ?? 0) >= exigido
}

// Espelha o seed da migration. Serve de rede: sem a linha no banco, a tela
// mostra um plano desligado e coerente em vez de "R$ NaN por undefined".
export const PADRAO_ASSINATURA = {
  ativa: false, gateway: null, preco_centavos: 4990, moeda: 'BRL', ciclo: 'anual',
  titulo: 'Assinatura anual', descricao: 'Acesso ao report completo por um ano.',
  // Link de pagamento pronto (Mercado Pago, Stripe), criado no painel do
  // gateway sem integracao nenhuma. E o caminho mais curto entre "quero vender"
  // e "vendi": a pessoa paga no link, e o acesso e liberado a mao no admin.
  // Quando a integracao de verdade existir, o link continua valendo para
  // cortesia, cobranca avulsa e venda por fora.
  link_pagamento: null,
}

export async function configuracao(sb, chave, padrao = {}) {
  const { data } = await sb.from('app_settings').select('value').eq('key', chave).maybeSingle()
  return { ...padrao, ...(data?.value ?? {}) }
}

// 'assinante' exige assinatura valida agora — quem cancelou continua assinante
// ate o fim do periodo que pagou, e por isso a data importa mais que o status.
export async function nivelDoUsuario(sb, uid) {
  if (!uid) return 'anonimo'
  const { data } = await sb.from('subscriptions')
    .select('status, period_end').eq('user_id', uid).maybeSingle()
  if (!data) return 'cadastrado'
  const valeAte = data.period_end ? new Date(data.period_end).getTime() : 0
  const vigente = ['ativa', 'cancelada'].includes(data.status) && valeAte > Date.now()
  return vigente ? 'assinante' : 'cadastrado'
}

// Devolve o arquetipo sem os campos que este nivel nao pode ver, mais a lista
// do que ficou de fora — a tela precisa saber o que prometer, e a contagem tem
// que sair daqui para nunca mentir sobre quantas partes faltam.
export function aplicarTravas(arquetipo, travas, nivel) {
  if (!arquetipo) return { arquetipo: null, bloqueados: [], proximoNivel: null }

  const visto = NIVEIS[nivel] ?? 0
  const aberto = { ...arquetipo }
  const bloqueados = []

  for (const bloco of BLOCOS) {
    const exigido = NIVEIS[travas?.[bloco.id]] ?? NIVEIS.cadastrado
    // Bloco que o arquetipo nao tem nao conta como bloqueado: prometer sete
    // partes e entregar cinco e pior do que prometer cinco.
    const temConteudo = bloco.campos.some(c => {
      const v = arquetipo[c]
      return Array.isArray(v) ? v.length > 0 : Boolean(v)
    })
    if (!temConteudo || visto >= exigido) continue

    for (const campo of bloco.campos) delete aberto[campo]
    bloqueados.push({ id: bloco.id, rotulo: bloco.rotulo, promessa: bloco.promessa,
                      exige: travas?.[bloco.id] ?? 'cadastrado' })
  }

  // O degrau mais barato que abre alguma coisa: nao adianta oferecer assinatura
  // para quem ainda nem tem conta e resolveria metade so criando uma.
  const proximoNivel = bloqueados.some(b => b.exige === 'cadastrado') ? 'cadastrado'
                     : bloqueados.length ? 'assinante' : null

  return { arquetipo: aberto, bloqueados, proximoNivel }
}

export const precoEmReais = (centavos) =>
  (Number(centavos ?? 0) / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
