// Todo acesso de escrita passa por Netlify Function. O browser nunca fala
// direto com o banco para gravar. Ver decisao 1 no CLAUDE.md.
const base = '/.netlify/functions'

async function chamar(rota, { metodo = 'GET', corpo, token } = {}) {
  const r = await fetch(`${base}/${rota}`, {
    method: metodo,
    headers: {
      ...(corpo ? { 'content-type': 'application/json' } : {}),
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    ...(corpo ? { body: JSON.stringify(corpo) } : {}),
  })
  const dados = await r.json().catch(() => ({}))
  if (!r.ok) throw new Error(dados.erro || `falha em ${rota}`)
  return dados
}

export const iniciarSessao = (mode, utm) =>
  chamar('session-start', { metodo: 'POST', corpo: { mode, utm } })

export const salvarRespostas = (token, respostas) =>
  chamar('session-answer', { metodo: 'POST', corpo: { token, respostas } })

export const finalizarSessao = (token, extras = {}) =>
  chamar('session-finish', { metodo: 'POST', corpo: { token, ...extras } })

export const buscarResultado = (token) =>
  chamar(`result-get?token=${encodeURIComponent(token)}`)

export const adminCarregar = (token, instrumento) =>
  chamar(`admin-instrument${instrumento ? `?instrument=${instrumento}` : ''}`, { token })

export const adminEditarPergunta = (token, campos) =>
  chamar('admin-instrument', { metodo: 'PATCH', corpo: campos, token })

export const adminPublicar = (token, corpo) =>
  chamar('admin-publish', { metodo: 'POST', corpo, token })

export const adminMetricas = (token) => chamar('admin-metrics', { token })
