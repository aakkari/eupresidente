import { admin } from './_lib/supabase.js'
import { json, erro, corpo, protegido, hashIp, rateLimit } from './_lib/http.js'

// Fala comigo: a mensagem chega aqui e cai na caixa do admin.
export default protegido(async (req) => {
  if (req.method !== 'POST') return erro('metodo nao permitido', 405)

  const sb = admin()
  const ip = await hashIp(req)

  // Limite por IP: um formulario de contato aberto sem freio vira caixa de
  // spam em uma tarde.
  if (ip && !await rateLimit(sb, `contato:${ip}`, 5, 3600))
    return erro('muitas mensagens em pouco tempo, tente daqui a pouco', 429)

  const body = await corpo(req) || {}
  const nome = String(body.nome ?? '').trim().slice(0, 120)
  const email = String(body.email ?? '').trim().toLowerCase().slice(0, 160)
  const assunto = String(body.assunto ?? '').trim().slice(0, 120) || null
  const mensagem = String(body.mensagem ?? '').trim().slice(0, 4000)

  if (!nome) return erro('diga seu nome')
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return erro('email invalido')
  if (mensagem.length < 10) return erro('escreva um pouco mais')

  // Login e opcional. Quando existe, guardamos quem e — assim o admin abre a
  // pessoa direto, sem casar email na mao.
  const header = req.headers.get('authorization') || ''
  const jwt = header.startsWith('Bearer ') ? header.slice(7) : null
  const { data: auth } = jwt ? await sb.auth.getUser(jwt) : { data: null }

  const { error } = await sb.from('contact_messages').insert({
    name: nome, email, subject: assunto, message: mensagem,
    user_id: auth?.user?.id ?? null, ip_hash: ip,
  })
  if (error) return erro(error.message, 400)

  return json({ ok: true })
})
