import { exigirAdmin } from './_lib/auth.js'
import { json, erro, corpo, protegido } from './_lib/http.js'
import { BLOCOS, RECURSOS, configuracao, PADRAO_RECURSOS, PADRAO_TRAVAS } from './_lib/plano.js'
import { disponiveis, GATEWAYS } from './_lib/gateway.js'

// Preco e fronteira do que e pago. Os dois moram no banco e nao no codigo:
// mudar de ideia sobre quanto custa ou sobre o que e gratis nao pode exigir
// deploy.
const NIVEIS = ['todos', 'cadastrado', 'assinante']

export default protegido(async (req) => {
  const auth = await exigirAdmin(req)
  if (!auth.ok) return erro(auth.motivo, 401)
  const sb = auth.sb

  if (req.method === 'GET') {
    const [assinatura, travas, recursos] = await Promise.all([
      configuracao(sb, 'assinatura'),
      configuracao(sb, 'travas', PADRAO_TRAVAS),
      configuracao(sb, 'recursos', PADRAO_RECURSOS),
    ])
    return json({
      assinatura, travas, recursos,
      recursos_disponiveis: RECURSOS,
      // A tela precisa dos rotulos e das promessas para nao repetir texto que
      // ja existe no servidor e sair do ar quando um mudar.
      blocos: BLOCOS.map(({ id, rotulo, promessa }) => ({ id, rotulo, promessa })),
      niveis: NIVEIS,
      gateways: GATEWAYS,
      gateways_disponiveis: disponiveis(),
    })
  }

  if (req.method === 'PUT') {
    const body = await corpo(req) || {}
    const agora = new Date().toISOString()
    const gravar = []

    if (body.assinatura) {
      const a = body.assinatura
      const centavos = Math.round(Number(a.preco_centavos))
      if (!Number.isFinite(centavos) || centavos < 0 || centavos > 100000000)
        return erro('preco invalido')
      if (a.gateway && !GATEWAYS.includes(a.gateway)) return erro('gateway desconhecido')

      gravar.push({
        key: 'assinatura', updated_at: agora, updated_by: auth.user.id,
        value: {
          ativa: Boolean(a.ativa),
          gateway: a.gateway || null,
          preco_centavos: centavos,
          moeda: String(a.moeda || 'BRL').slice(0, 3).toUpperCase(),
          ciclo: a.ciclo === 'mensal' ? 'mensal' : 'anual',
          titulo: String(a.titulo ?? '').slice(0, 80) || 'Assinatura anual',
          descricao: String(a.descricao ?? '').slice(0, 240),
        },
      })
    }

    if (body.recursos) {
      const value = {}
      for (const r of RECURSOS) {
        const nivel = body.recursos[r.id]
        value[r.id] = NIVEIS.includes(nivel) ? nivel : PADRAO_RECURSOS[r.id]
      }
      gravar.push({ key: 'recursos', value, updated_at: agora, updated_by: auth.user.id })
    }

    if (body.travas) {
      const value = {}
      for (const bloco of BLOCOS) {
        const nivel = body.travas[bloco.id]
        // Bloco desconhecido no corpo e ignorado; nivel invalido volta para o
        // padrao em vez de gravar lixo que a trava depois leria como
        // 'cadastrado' sem ninguem saber.
        value[bloco.id] = NIVEIS.includes(nivel) ? nivel : PADRAO_TRAVAS[bloco.id]
      }
      gravar.push({ key: 'travas', value, updated_at: agora, updated_by: auth.user.id })
    }

    if (!gravar.length) return erro('nada para gravar')

    const { error } = await sb.from('app_settings').upsert(gravar, { onConflict: 'key' })
    if (error) return erro(error.message, 400)
    return json({ ok: true })
  }

  return erro('metodo nao permitido', 405)
})
