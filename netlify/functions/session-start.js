import { admin } from './_lib/supabase.js'
import { json, erro, corpo, hashIp, rateLimit, protegido } from './_lib/http.js'

// Cria a sessao e devolve as perguntas do modo escolhido.
//
// Sem login a sessao nasce anonima: so um token. Cadastro, se houver, vem
// depois de responder — pedir antes derruba a taxa de conclusao.
//
// COM login, ela ja nasce da pessoa. Antes nao nascia, e quem respondia logado
// terminava com uma sessao orfa: o resultado existia, mas a conta dela dizia
// "0 questionarios respondidos" ate alguem clicar em "Guardar na minha conta"
// no fim do report. Ninguem clica num botao para receber o que ja achava que
// era seu.
// Agrupa por eixo e embaralha por dentro.
//
// Agrupar reduz troca de contexto: a pessoa passa alguns minutos pensando em
// economia antes de mudar de assunto, e responde melhor. Embaralhar por dentro
// evita os dois efeitos colaterais de agrupar demais — a consistencia inflada
// (quem ve cinco itens seguidos da mesma faceta lembra do que respondeu e
// tenta ficar coerente, mesmo quando nao e) e o gabarito obvio (itens da mesma
// faceta com direcoes alternadas entregam o que esta sendo medido).
//
// A ordem dos eixos tambem varia por sessao: sempre comecar por economia
// enviesaria o conjunto, porque as primeiras respostas sao as mais atentas.
const ORDEM_EIXOS = ['ECO', 'SOC', 'AUT', 'NAC', 'DEM', 'AMB']

function ordenar(perguntas, semente) {
  // Embaralhamento deterministico pela sessao: recarregar a pagina nao
  // remonta o questionario numa ordem diferente.
  let h = 0
  for (const c of String(semente)) h = (h * 31 + c.charCodeAt(0)) % 2147483647
  const rnd = () => (h = (h * 1103515245 + 12345) % 2147483647) / 2147483647

  const misturar = xs => {
    const a = [...xs]
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(rnd() * (i + 1))
      ;[a[i], a[j]] = [a[j], a[i]]
    }
    return a
  }

  const porEixo = {}
  for (const p of perguntas) (porEixo[p.axis] ||= []).push(p)

  const eixos = misturar(ORDEM_EIXOS.filter(e => porEixo[e]?.length))
  return eixos.flatMap(e => misturar(porEixo[e]))
}

export default protegido(async (req) => {
  if (req.method !== 'POST') return erro('metodo nao permitido', 405)

  const body = await corpo(req) || {}
  const mode = body.mode === 'short' ? 'short' : 'long'
  const sb = admin()

  // Login e opcional: sem ele o questionario funciona igual, so que anonimo.
  const header = req.headers.get('authorization') || ''
  const jwt = header.startsWith('Bearer ') ? header.slice(7) : null
  const { data: auth } = jwt ? await sb.auth.getUser(jwt) : { data: null }
  const dono = auth?.user?.id ?? null

  const ip = await hashIp(req)
  if (ip && !(await rateLimit(sb, `start:${ip}`, 20, 3600)))
    return erro('muitas sessoes iniciadas, tente mais tarde', 429)

  const { data: instrumento, error: eInst } = await sb
    .from('instruments').select('id, label, axes, axis_weights')
    .eq('active', true).order('created_at', { ascending: false }).limit(1).maybeSingle()

  if (eInst) return erro(eInst.message, 500)
  if (!instrumento) return erro('nenhum instrumento publicado', 503)

  const { data: sessao, error: eSess } = await sb.from('sessions').insert({
    instrument_id: instrumento.id,
    mode,
    user_id: dono,
    claimed_at: dono ? new Date().toISOString() : null,
    ip_hash: ip,
    ua_hash: (req.headers.get('user-agent') || '').slice(0, 120) || null,
    utm: body.utm ?? null,
  }).select('id, token').single()

  if (eSess) return erro(eSess.message, 500)

  let q = sb.from('questions')
    .select('id, block, ord, body, axis, facet')
    .eq('instrument_id', instrumento.id)
  q = mode === 'short' ? q.eq('in_short', true) : q.eq('in_long', true)

  const { data: perguntas, error: ePerg } = await q
  if (ePerg) return erro(ePerg.message, 500)

  // axis vai junto so para o front agrupar visualmente. Direcao, peso e
  // intensidade ficam no servidor: quem enxerga o gabarito fabrica o
  // resultado e envenena a base de pesquisa.
  return json({
    token: sessao.token, instrumento, mode,
    perguntas: ordenar(perguntas ?? [], sessao.id),
  })
})
