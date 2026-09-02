import { exigirUsuario } from './_lib/auth.js'
import { json, erro, corpo, protegido } from './_lib/http.js'

// Apagar um report da conta.
//
// Apaga de verdade: a sessao cai e o cascade leva respostas, resultado,
// consentimentos, demografia e comparacoes junto. Nao existe soft delete aqui —
// uma coluna deleted_at que so esconde a linha e uma promessa quebrada com
// aparencia de recurso.
//
// O que NAO cai e a linha da research_pool, que e anonima e nao tem chave
// estrangeira para a conta (decisao 3 do CLAUDE.md). Ela nao aponta para
// ninguem, entao nao ha o que apagar por pessoa — e a tela diz isso em vez de
// deixar a pessoa supor o contrario.
export default protegido(async (req) => {
  if (req.method !== 'POST') return erro('metodo nao permitido', 405)

  const auth = await exigirUsuario(req)
  if (!auth.ok) return erro(auth.motivo, 401)

  const body = await corpo(req) || {}
  const token = String(body.token ?? '')
  if (!token) return erro('token do resultado obrigatorio')

  const { data: sessao } = await auth.sb.from('sessions')
    .select('id, user_id').eq('token', token).maybeSingle()
  if (!sessao) return erro('resultado nao encontrado', 404)

  // Dono, e nao portador do link: quem recebeu o link compartilhado pode ler,
  // nunca apagar.
  if (sessao.user_id !== auth.uid) return erro('esse resultado nao e seu', 403)

  const { error } = await auth.sb.from('sessions').delete().eq('id', sessao.id)
  if (error) return erro(error.message, 400)

  return json({ ok: true })
})
