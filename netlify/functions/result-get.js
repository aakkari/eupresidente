import { admin } from './_lib/supabase.js'
import { json, erro, protegido } from './_lib/http.js'
import { posicaoPolitica } from './_lib/scoring.js'
import { aplicarTravas, configuracao, nivelDoUsuario, PADRAO_ASSINATURA, PADRAO_TRAVAS } from './_lib/plano.js'

// Le o resultado pelo token da sessao. O token e a credencial: quem tem o
// link ve o resultado. E por isso que ele e uuid v4 e nao um id sequencial.
//
// O que sai daqui depende do nivel de quem pede. A versao anterior mandava o
// report inteiro e a tela borrava no CSS — o que fecha a porta para quem olha
// e deixa aberta para quem inspeciona. Agora o campo travado nao entra na
// resposta.
export default protegido(async (req) => {
  const token = new URL(req.url).searchParams.get('token')
  if (!token) return erro('token obrigatorio')

  const sb = admin()

  // Login e opcional: sem ele a pessoa ainda ve o resultado pelo link, so que
  // no nivel anonimo.
  const header = req.headers.get('authorization') || ''
  const jwt = header.startsWith('Bearer ') ? header.slice(7) : null
  const { data: auth } = jwt ? await sb.auth.getUser(jwt) : { data: null }
  const uid = auth?.user?.id ?? null

  const { data: sessao } = await sb.from('sessions')
    .select('id, mode, instrument_id, user_id').eq('token', token).maybeSingle()
  if (!sessao) return erro('sessao nao encontrada', 404)

  const { data: resultado } = await sb.from('results')
    .select('*').eq('session_id', sessao.id).maybeSingle()
  if (!resultado) return erro('resultado ainda nao calculado', 404)

  const [{ data: arquetipos }, { data: instrumento }, travas, nivel] = await Promise.all([
    sb.from('archetypes').select('*').eq('instrument_id', sessao.instrument_id),
    sb.from('instruments').select('label, axes, facets').eq('id', sessao.instrument_id).single(),
    configuracao(sb, 'travas', PADRAO_TRAVAS),
    nivelDoUsuario(sb, uid),
  ])

  const bruto = arquetipos.find(a => a.id === resultado.archetype_id) ?? null
  const { arquetipo, bloqueados, proximoNivel } = aplicarTravas(bruto, travas, nivel)

  const assinatura = proximoNivel === 'assinante' ? await configuracao(sb, 'assinatura', PADRAO_ASSINATURA) : null

  return json({
    // Calculado na leitura, nao gravado: e deterministico a partir do vetor,
    // entao persistir seria uma copia que pode divergir da formula.
    posicao: posicaoPolitica(resultado.vector),
    resultado,
    instrumento,
    arquetipo,
    arquetipo_secundario: resumir(arquetipos.find(a => a.id === resultado.archetype_secondary_id)),
    // O mapa precisa de nome, cor e centroide. Mandar a linha inteira daria a
    // qualquer um o conteudo editorial de todas as familias — inclusive a
    // travada, que e a propria da pessoa.
    todos_arquetipos: arquetipos.map(resumir),
    nivel,
    meu: Boolean(uid && sessao.user_id === uid),
    // Sem dono: ou a pessoa respondeu deslogada, ou e uma sessao antiga de
    // antes de a vinculacao acontecer no inicio. So nesse caso faz sentido
    // oferecer guardar — se ja tem dono e nao e voce, o link e de outra pessoa.
    orfa: !sessao.user_id,
    trava: bloqueados.length
      ? { proximo_nivel: proximoNivel, blocos: bloqueados,
          preco_centavos: assinatura?.preco_centavos ?? null,
          assinatura_ativa: Boolean(assinatura?.ativa) }
      : null,
  })
})

const resumir = (a) => a && ({ id: a.id, name: a.name, color: a.color, centroid: a.centroid })
