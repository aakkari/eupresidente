export const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  })

export const erro = (msg, status = 400) => json({ erro: msg }, status)

export async function corpo(req) {
  try { return await req.json() } catch { return null }
}

// Hash de IP para deteccao de replay. Com salt, porque hash de IP sem salt e
// reversivel por forca bruta — o espaco de IPv4 tem 4 bilhoes de entradas, o
// que um notebook percorre em minutos.
export async function hashIp(req) {
  const ip = req.headers.get('x-nf-client-connection-ip')
        || req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
  if (!ip) return null
  const salt = process.env.IP_SALT || ''
  const dados = new TextEncoder().encode(salt + ip)
  const buf = await crypto.subtle.digest('SHA-256', dados)
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 32)
}

// Janela fixa por chave. Suficiente para conter abuso trivial de criacao de
// sessao; nao substitui protecao de borda.
export async function rateLimit(sb, chave, limite, janelaSegundos) {
  const agora = new Date()
  const { data } = await sb.from('rate_limits').select('*').eq('key', chave).maybeSingle()

  if (!data || (agora - new Date(data.window_start)) / 1000 > janelaSegundos) {
    await sb.from('rate_limits').upsert({ key: chave, count: 1, window_start: agora.toISOString() })
    return true
  }
  if (data.count >= limite) return false
  await sb.from('rate_limits').update({ count: data.count + 1 }).eq('key', chave)
  return true
}
