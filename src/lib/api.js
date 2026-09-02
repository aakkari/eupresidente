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

// O login vai junto quando existe: e ele que decide quanto do report o
// servidor manda. Sem login o link ainda abre, no nivel anonimo.
export const buscarResultado = (tokenResultado, login) =>
  chamar(`result-get?token=${encodeURIComponent(tokenResultado)}`, { token: login })

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

export const resumoInstrumento = () => chamar('instrumento')

export const meuPerfil = (token) => chamar('perfil', { token })

export const salvarPerfil = (token, campos) =>
  chamar('perfil', { metodo: 'PATCH', corpo: campos, token })

export const apagarResultado = (token, resultadoToken) =>
  chamar('resultado-apagar', { metodo: 'POST', corpo: { token: resultadoToken }, token })

export const minhaAssinatura = (token) => chamar('assinatura', { token })

export const assinar = (token) => chamar('assinatura', { metodo: 'POST', token })

export const cancelarAssinatura = (token) =>
  chamar('assinatura', { metodo: 'DELETE', token })

export const adminConfig = (token) => chamar('admin-config', { token })

export const adminSalvarConfig = (token, corpo) =>
  chamar('admin-config', { metodo: 'PUT', corpo, token })

export const minhasComunidades = (token) => chamar('comunidade', { token })

export const previaConvite = (convite) =>
  chamar(`comunidade?convite=${encodeURIComponent(convite)}`)

export const acaoComunidade = (token, corpo) =>
  chamar('comunidade', { metodo: 'POST', corpo, token })

export const adminUsuarios = (token, usuario) =>
  chamar(`admin-usuarios${usuario ? `?usuario=${encodeURIComponent(usuario)}` : ''}`, { token })

export const adminPopulacao = (token) => chamar('admin-populacao', { token })

export const adminContato = (token, status) =>
  chamar(`admin-contato${status ? `?status=${encodeURIComponent(status)}` : ''}`, { token })

export const adminMarcarContato = (token, id, status) =>
  chamar('admin-contato', { metodo: 'PATCH', corpo: { id, status }, token })

export const enviarContato = (corpo, login) =>
  chamar('contato', { metodo: 'POST', corpo, token: login })

export const adminComunidades = (token) => chamar('admin-comunidades', { token })

export const adminPerfis = (token, instrumento) =>
  chamar(`admin-perfis${instrumento ? `?instrument=${encodeURIComponent(instrumento)}` : ''}`, { token })

export const adminSalvarPerfil = (token, corpo) =>
  chamar('admin-perfis', { metodo: 'PATCH', corpo, token })

export const adminResumo = (token) => chamar('admin-resumo', { token })
