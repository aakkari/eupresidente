import { admin } from './supabase.js'

// O admin nao tem tabela de papeis: a lista de emails vive em variavel de
// ambiente. Menos uma tabela para manter em sincronia, e trocar quem tem
// acesso nao exige migration.
export async function exigirAdmin(req) {
  const header = req.headers.get('authorization') || ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : null
  if (!token) return { ok: false, motivo: 'sem token' }

  const sb = admin()
  const { data, error } = await sb.auth.getUser(token)
  if (error || !data?.user) return { ok: false, motivo: 'token invalido' }

  const permitidos = (process.env.ADMIN_EMAILS || '')
    .split(',').map(e => e.trim().toLowerCase()).filter(Boolean)
  const email = (data.user.email || '').toLowerCase()

  if (!permitidos.includes(email)) return { ok: false, motivo: 'nao autorizado' }
  return { ok: true, user: data.user, sb }
}
