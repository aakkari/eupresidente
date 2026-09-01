# EU PRESIDENTE

Instrumento de autoconhecimento político. A pessoa responde a um questionário
por blocos temáticos, recebe um vetor de posições em eixos, um arquétipo, e um
relatório que explica cada princípio, compara com outros países e situa a
posição dentro das escolas de pensamento político.

Três produtos no mesmo motor: ferramenta de autoconhecimento para o público,
base de pesquisa de opinião agregada, e canal de mídia e geração de leads.

Stack: Supabase (Postgres + Auth) · Netlify (site + Functions) · React + Vite.

---

## Decisões travadas

Estas não são preferências de estilo. Cada uma existe porque a alternativa
quebra o produto, a pesquisa ou a lei. Se você for reverter alguma, pare e
pergunte antes.

**1. O browser nunca escreve.**
Não existe nenhuma policy de `INSERT`, `UPDATE` ou `DELETE` no banco, e os
grants de escrita foram revogados de `anon` e `authenticated`. Toda escrita
passa por Netlify Function com `service_role`. Motivo: com escrita direta do
cliente, qualquer pessoa fabrica respostas em massa e contamina a base de
pesquisa — que é o ativo de longo prazo.

**2. O LLM nunca classifica.**
`results` é calculado por fórmula determinística: mesmo conjunto de respostas,
mesmo vetor, mesmo arquétipo, sempre. O LLM só escreve prosa em `reports`, em
cima de um resultado já fechado. Motivo: classificação política precisa ser
auditável e reproduzível. "O modelo decidiu" não se defende publicamente.

**3. A versão curta não alimenta a base de pesquisa.**
`short` serve para viralizar; `long` serve para pesquisar. Só `long` com
`research_eligible = true` entra em `research_pool`. Motivo: n grande de
instrumento curto é ruído com aparência de dado.

**4. `research_pool` não tem FK para `sessions` nem para `auth.users`.**
É irreversível por desenho. Não existe caminho de volta da linha de pesquisa
para a pessoa. Nunca adicione coluna que permita re-identificação — nem
`created_at` com precisão de segundo, nem cidade, nem faixa etária estreita.
Consequência aceita: `purge_user` não apaga de `research_pool`, porque não há
como localizar a linha. É isso que torna o dado anônimo de verdade.

**5. Opinião política é dado sensível (LGPD art. 5º II).**
Legítimo interesse não serve como base legal (art. 11). Só consentimento
específico, por finalidade, registrado em `consents` com a versão da política.
Três finalidades separadas, nunca em bloco: `perfil_individual`,
`pesquisa_agregada`, `comunicacao_email`.

**6. `reports` é gerado uma vez e nunca regerado.**
`unique(result_id)` é a trava de custo, não um detalhe de modelagem. Sem ela,
um F5 numa página vira chamada de LLM.

**7. Célula agregada mínima de 100.**
`aggregate_snapshots` tem `check (n >= 100)`. Recorte menor que isso
re-identifica. O check existe para que ninguém publique um corte por município
sem perceber o que está fazendo.

**8. O repositório é a fonte da verdade.**
Toda mudança de schema vira migration versionada em `supabase/migrations/`.
Nunca edite o banco pelo dashboard e deixe o arquivo para depois — foi
exatamente assim que duas correções ficaram órfãs na primeira semana.

---

## Estrutura

```
supabase/migrations/   schema versionado, ordem cronológica
supabase/seed.sql      instrumento, perguntas e arquétipos
netlify/functions/     toda escrita e toda chamada de LLM
src/                   front, somente leitura do banco
docs/                  instrumento e arquétipos em prosa revisável
```

## Modelo de dados

`instruments` versiona o questionário — nunca edite uma versão publicada, crie
a v2. `questions` traz eixo, direção, peso e se entra na curta ou na longa.
`sessions` → `responses` (particionada em 16 por hash de `session_id`) →
`results` (determinístico) → `reports` (prosa do LLM).

Sessão nasce anônima com um `token`. Se a pessoa criar conta depois,
`claim_session` vincula. Isso permite responder sem cadastro — a fricção que
mata a taxa de conclusão.

## Armadilha conhecida: partições e RLS

`responses` é particionada. RLS na tabela pai **não** protege as partições
quando acessadas diretamente, e o PostgREST expõe cada partição como tabela
própria. Na v1 isso foi corrigido com RLS por partição mais `REVOKE`. Se você
criar novas partições, aplique as duas coisas — a verificação que só olha
`relispartition = false` passa limpa e mente.

---

## Como o codigo esta organizado

**Front** (`src/`) so le. Home, Quiz e Resultado conversam exclusivamente com
Netlify Functions — o browser nunca abre conexao de escrita com o banco.

**Functions** (`netlify/functions/`) fazem tudo o que altera estado, com
`service_role`. `_lib/scoring.js` e o motor deterministico: nenhuma chamada de
LLM entra nesse arquivo, hoje ou depois.

**Admin** (`src/pages/admin/`) revisa perguntas e le metricas do instrumento.
A autorizacao e sempre no servidor (`_lib/auth.js` confere o token contra
`ADMIN_EMAILS`); esconder botao no front nao e controle de acesso.

## O gabarito nao vai para o browser

`session-start` devolve `id`, `body`, `block` e `axis` — nunca `direction`,
`weight` ou `secondary_weight`. Quem conhece a direcao e o peso de cada item
fabrica o resultado que quiser e, pior, envenena a base de pesquisa de forma
dificil de detectar. Se precisar agrupar visualmente por eixo, `axis` basta.

## Metricas que avaliam o instrumento

O painel de metricas nao existe para contar visitas. Ele mostra tres coisas:

- **Distribuicao de arquetipos** — um que nunca aparece tem centroide mal
  posicionado; um que leva quase tudo significa que o instrumento nao
  discrimina.
- **Consistencia por eixo** — valor baixo indica pergunta invertida mal
  redigida: a pessoa nao percebeu que era o contrario, e o eixo passou a medir
  interpretacao de texto em vez de opiniao. Abaixo de 0,6, reescreva.
- **Flags de qualidade** — quanto da base esta sendo descartada, e por que.

`scripts/validar-instrumento.mjs` complementa: testa se cada arquetipo e
alcancavel antes de qualquer pessoa responder. Rode depois de mexer em
centroide, peso ou direcao.
