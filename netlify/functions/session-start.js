import { admin } from './_lib/supabase.js'
import { json, erro, corpo, hashIp, rateLimit, protegido } from './_lib/http.js'

// Cria a sessao e devolve as perguntas do modo escolhido.
// A sessao nasce anonima: so um token. Cadastro, se houver, vem depois de
// responder — pedir antes derruba a taxa de conclusao.
export default protegido(async (req) => {
  if (req.method !== 'POST') return erro('metodo nao permitido', 405)

  const body = await corpo(req) || {}
  const mode = body.mode === 'short' ? 'short' : 'long'
  const sb = admin()

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
    ip_hash: ip,
    ua_hash: (req.headers.get('user-agent') || '').slice(0, 120) || null,
    utm: body.utm ?? null,
  }).select('id, token').single()

  if (eSess) return erro(eSess.message, 500)

  let q = sb.from('questions')
    .select('id, block, ord, body, axis')
    .eq('instrument_id', instrumento.id)
    .order('block').order('ord')
  q = mode === 'short' ? q.eq('in_short', true) : q.eq('in_long', true)

  const { data: perguntas, error: ePerg } = await q
  if (ePerg) return erro(ePerg.message, 500)

  // axis vai junto so para o front agrupar visualmente. Direcao e peso ficam
  // no servidor: quem enxerga o gabarito consegue fabricar o resultado.
  return json({ token: sessao.token, instrumento, mode, perguntas })
})
