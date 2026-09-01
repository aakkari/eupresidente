// Barra divergente: o zero fica no centro e a posicao cresce para um dos
// lados. Escala de -1 a +1 mapeada em 0..100% de largura.
export default function EixoBarra({ eixo, valor, confianca, meta }) {
  const pct = ((valor + 1) / 2) * 100
  const baixa = confianca !== undefined && confianca < 0.5

  return (
    <div className="py-3">
      <div className="mb-1.5 flex items-baseline justify-between gap-3 text-xs">
        <span className="font-medium">{meta?.nome ?? eixo}</span>
        {baixa && (
          <span className="text-[11px] text-grafia" title="poucas perguntas respondidas ou muitas sem posição">
            medida fraca
          </span>
        )}
      </div>

      <div className="relative h-8 rounded border border-borda bg-white">
        <div className="absolute inset-y-0 left-1/2 w-px bg-borda" />
        <div
          className={`absolute inset-y-1 rounded-sm ${baixa ? 'bg-grafia/30' : 'bg-tinta'}`}
          style={
            valor >= 0
              ? { left: '50%', width: `${Math.max(pct - 50, 1)}%` }
              : { right: '50%', width: `${Math.max(50 - pct, 1)}%` }
          }
        />
      </div>

      <div className="mt-1 flex justify-between text-[11px] text-grafia">
        <span>{meta?.neg}</span>
        <span className="tabular-nums">{valor > 0 ? '+' : ''}{valor.toFixed(2)}</span>
        <span>{meta?.pos}</span>
      </div>
    </div>
  )
}
