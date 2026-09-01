# Instrumento v1 — eixos, blocos e escala

## O que o instrumento mede

Seis eixos independentes. Cada um vai de **-1 a +1**, e a posição da pessoa é
um ponto nesse espaço de seis dimensões — não uma casinha num quadrante.

Isso é uma escolha deliberada contra o modelo popular de duas dimensões
(econômico × social). Duas dimensões colapsam coisas que no Brasil andam
separadas: dá para ser estatista na economia e liberal nos costumes, ou
defensor do mercado e autoritário na segurança. O quadrante achata essas
combinações e é por isso que as pessoas não se reconhecem no resultado.

| Código | Eixo | −1 | +1 |
|---|---|---|---|
| `ECO` | Economia | Estado coordena | Mercado coordena |
| `SOC` | Costumes | Tradição preserva | Autonomia individual |
| `AUT` | Autoridade | Liberdade civil | Ordem e coerção |
| `NAC` | Fronteira | Integração global | Soberania nacional |
| `DEM` | Poder | Instituições e contrapesos | Vontade popular direta |
| `AMB` | Horizonte | Crescimento hoje | Sustentabilidade longa |

**Por que `DEM` existe.** É o eixo que a maioria dos testes internacionais não
tem, e o que mais explica o conflito político brasileiro da última década.
Populismo não é posição de esquerda ou de direita — é uma posição sobre *quem
decide* quando a maioria e a regra se contradizem. Sem esse eixo, um populista
de esquerda e um social-democrata caem no mesmo ponto, o que é falso.

**Por que `AMB` é separado de `ECO`.** Ambientalismo correlaciona com
estatismo, mas não é a mesma coisa: existe ambientalismo de mercado (taxa de
carbono, mercado de créditos) e desenvolvimentismo estatal poluidor. Juntar os
dois eixos apagaria os dois grupos.

## Blocos temáticos

Bloco é o assunto da pergunta; eixo é o que ela mede. Um bloco alimenta vários
eixos, e um eixo é alimentado por vários blocos — é isso que impede a pessoa de
adivinhar o gabarito e responder a imagem que quer projetar.

| Bloco | Assunto | Eixos que alimenta |
|---|---|---|
| `trabalho` | Emprego, sindicato, renda, tributação | ECO, NAC |
| `seguranca` | Polícia, prisão, drogas, armas | AUT, SOC |
| `costumes` | Família, religião, gênero, aborto | SOC, AUT |
| `democracia` | Judiciário, imprensa, eleição, corrupção | DEM, AUT |
| `ambiente` | Clima, Amazônia, agro, energia | AMB, ECO |
| `mundo` | Comércio, imigração, blocos, defesa | NAC, ECO |
| `servicos` | Saúde, educação, previdência | ECO, SOC |
| `tecnologia` | Redes, IA, dados, plataformas | DEM, AUT |

## Escala

Likert de 5 pontos, de **-2** (discordo totalmente) a **+2** (concordo
totalmente), com 0 explícito como "não tenho posição formada" — e não como
meio-termo. A diferença importa: `neutral_rate` alto vira sinal de baixa
confiança no resultado, não de moderação. Quem não sabe não é centrista.

Contribuição de uma resposta para um eixo:

```
contribuicao = value * direction * weight
```

`direction` (-1 ou +1) inverte perguntas escritas ao contrário — metade de cada
eixo é redigida na direção oposta, para quebrar aquiescência (a tendência de
concordar com tudo). `weight` distingue pergunta central de pergunta periférica.
`secondary_axis` deixa uma pergunta contribuir para um segundo eixo com peso
menor, porque posições reais raramente são unidimensionais.

A posição final no eixo é a soma das contribuições dividida pela soma dos pesos
possíveis — o que mantém a escala em -1..+1 mesmo quando a pessoa pula perguntas
ou responde a versão curta.

## Duas versões

**Curta** — 16 perguntas, `in_short = true`, concentradas nos blocos de maior
poder discriminante, com cobertura dos seis eixos (3 em ECO, SOC, AUT e DEM; 2 em
NAC e AMB). Serve para viralizar e gerar lead. Não entra na base de
pesquisa: n grande de instrumento curto é ruído com cara de dado.

**Longa** — 50 perguntas, cobertura equilibrada dos 8 blocos, com pares de
atenção e itens invertidos. É a única que alimenta `research_pool`.

## Controle de qualidade

Quatro heurísticas, já implementadas em `detect_quality_flags`:

- `fast` — mediana de intervalo entre respostas abaixo de 2s
- `straightline` — mais de 70% das respostas no mesmo valor
- `attention_fail` — o par em `attention_pair` traz duas formulações
  logicamente opostas; concordar com as duas reprova
- `replay` — três ou mais sessões completas do mesmo `ip_hash` em 24h

Qualquer flag zera `research_eligible`. A pessoa continua vendo o resultado
dela — a exclusão é da base de pesquisa, não da experiência.

## Peso secundário negativo

`secondary_weight` aceita valor negativo, e isso não é erro de digitação. A
contribuição é `value * direction * peso`, então um peso secundário negativo
inverte o sentido no segundo eixo sem precisar de uma coluna
`secondary_direction`. Usado uma vez na v1: cota em universidade pública (`v05`)
empurra `SOC` para autonomia **e** `ECO` para o Estado — direções opostas na
mesma resposta.

## Balanço da v1, medido no banco

| Eixo | Perguntas | Direta | Invertida | Na curta | Como eixo secundário |
|---|---|---|---|---|---|
| ECO | 12 | 5 | 7 | 3 | 6 |
| AUT | 10 | 6 | 4 | 3 | 4 |
| SOC | 8 | 5 | 3 | 3 | 4 |
| DEM | 8 | 5 | 3 | 3 | 3 |
| AMB | 6 | 3 | 3 | 2 | 0 |
| NAC | 6 | 3 | 3 | 2 | 0 |

Nenhum eixo tem todas as perguntas na mesma direção — se tivesse, mediria
aquiescência em vez de opinião. `ECO` e `AUT` carregam mais itens porque são os
eixos com maior variância esperada na população brasileira.
