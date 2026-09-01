// Detalhe dentro de cada eixo. Um eixo resumido num numero so nao diz onde a
// pessoa e radical e onde e morna — a faceta diz.
export default function Facetas({ facetVector, facetas, eixos, cor }) {
  if (!facetVector || Object.keys(facetVector).length === 0) return null

  // Agrupa por eixo, na ordem em que os eixos aparecem no resultado.
  const porEixo = {}
  for (const [id, valor] of Object.entries(facetVector)) {
    const meta = facetas?.[id]
    if (!meta) continue
    ;(porEixo[meta.eixo] ||= []).push({ id, valor, ...meta })
  }

  return (
    <div className="space-y-6">
      {Object.entries(porEixo).map(([eixo, itens]) => (
        <div key={eixo}>
          <h3 className="rotulo mb-2">{eixos?.[eixo]?.nome ?? eixo}</h3>
          <div className="cartao divide-y divide-borda px-4">
            {itens.map(f => (
              <div key={f.id} className="py-3">
                <div className="mb-1.5 flex items-baseline justify-between gap-3">
                  <span className="text-sm font-medium">{f.nome}</span>
                  <span className="text-xs tabular-nums text-grafia">
                    {f.valor > 0 ? '+' : ''}{f.valor.toFixed(2)}
                  </span>
                </div>
                <div className="relative h-1.5 rounded-full bg-borda">
                  <div className="absolute inset-y-0 left-1/2 w-px bg-white/70" />
                  <div className="absolute inset-y-0 rounded-full" style={{
                    background: cor,
                    ...(f.valor >= 0
                      ? { left: '50%', width: `${Math.max(f.valor * 50, 1)}%` }
                      : { right: '50%', width: `${Math.max(-f.valor * 50, 1)}%` }) }} />
                </div>
                <div className="mt-1 flex justify-between text-[10px] text-grafia">
                  <span>{f.neg}</span><span>{f.pos}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
