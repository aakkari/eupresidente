import { exigirUsuario } from './_lib/auth.js'
import { json, erro, corpo, protegido } from './_lib/http.js'

// Le e grava os dados da conta. Sem CPF nem documento, por decisao registrada
// na migration: identificador unico somado a opiniao politica e o pior tipo
// de base para existir.
//
// Ano de nascimento em vez de data completa pelo mesmo motivo: a faixa etaria
// que a pesquisa usa sai igual dos dois, e dia e mes so servem para
// reidentificar.
const CAMPOS = ['full_name', 'display_name', 'phone', 'birth_year', 'city', 'uf',
                'education', 'occupation', 'created_at']

export default protegido(async (req) => {
  const auth = await exigirUsuario(req)
  if (!auth.ok) return erro(auth.motivo, 401)
  const { sb, uid } = auth

  if (req.method === 'GET') {
    const [{ data }, { count }] = await Promise.all([
      sb.from('profiles').select(CAMPOS.join(', ')).eq('user_id', uid).maybeSingle(),
      sb.from('sessions').select('id', { count: 'exact', head: true })
        .eq('user_id', uid).eq('status', 'completed'),
    ])
    return json({
      email: auth.user.email,
      desde: data?.created_at ?? auth.user.created_at,
      questionarios: count ?? 0,
      ...(data ?? {}),
    })
  }

  if (req.method === 'PATCH') {
    const body = await corpo(req) || {}
    const campos = { user_id: uid, updated_at: new Date().toISOString() }

    // Limites e formatos no servidor: o front pode ser contornado, e uf fora
    // do padrao quebra o check da tabela com erro feio em vez de recusa clara.
    const texto = (v, n) => String(v ?? '').trim().slice(0, n) || null
    if ('full_name' in body)    campos.full_name    = texto(body.full_name, 120)
    if ('display_name' in body) campos.display_name = texto(body.display_name, 60)
    if ('occupation' in body)   campos.occupation   = texto(body.occupation, 80)
    if ('city' in body)         campos.city         = texto(body.city, 80)
    if ('education' in body)    campos.education    = texto(body.education, 40)
    if ('phone' in body)
      campos.phone = String(body.phone ?? '').replace(/[^\d+() -]/g, '').slice(0, 24) || null

    if ('uf' in body) {
      const uf = String(body.uf ?? '').trim().toUpperCase()
      if (uf && !/^[A-Z]{2}$/.test(uf)) return erro('uf deve ter duas letras')
      campos.uf = uf || null
    }

    if ('birth_year' in body) {
      const bruto = body.birth_year
      if (bruto === null || bruto === '') campos.birth_year = null
      else {
        const ano = Number(bruto)
        const limite = new Date().getFullYear()
        if (!Number.isInteger(ano) || ano < 1900 || ano > limite)
          return erro(`ano de nascimento deve estar entre 1900 e ${limite}`)
        campos.birth_year = ano
      }
    }

    const { error } = await sb.from('profiles').upsert(campos, { onConflict: 'user_id' })
    if (error) return erro(error.message, 400)
    return json({ ok: true })
  }

  return erro('metodo nao permitido', 405)
})
