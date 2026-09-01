// Todo acesso de escrita passa por Netlify Function. O browser nunca fala
// direto com o banco para gravar. Ver decisao 1 no CLAUDE.md.
const base = '/.netlify/functions'

async function chamar(rota, { metodo = 'GET', corpo, token } = {}) {
  let r
  try {
    r = await fetch(`${base}/${rota}`, {
      method: metodo,
      headers: {
        ...(corpo ? { 'content-type': 'application/json' } : {}),
        ...(token ? { authorization: `Bearer ${token}` } : {}),
      },
      ...(corpo ? { body: JSON.stringify(corpo) } : {}),
    })
  } catch (e) {
    // TypeError do fetch: a resposta nao chegou. Sem esta mensagem o usuario
    // ve apenas "Failed to fetch", que nao diz qual chamada falhou.
    throw new Error(`nao consegui falar com o servidor em ${rota} (${e.message})`)
  }

  const texto = await r.text().catch(() => '')
  let dados = {}
  try { dados = texto ? JSON.parse(texto) : {} } catch {
    // Resposta que nao e JSON quase sempre e pagina de erro do Netlify.
    if (!r.ok) throw new Error(`${rota} respondeu ${r.status}: ${texto.slice(0, 200)}`)
  }

  if (!r.ok) throw new Error(dados.erro || `${rota} respondeu ${r.status}`)
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

export const vincularSessao = (token, sessaoToken, display_name) =>
  chamar('session-claim', { metodo: 'POST', corpo: { token: sessaoToken, display_name }, token })

export const meusResultados = (token) => chamar('meus-resultados', { token })
