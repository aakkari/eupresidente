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

**9. Preço e fronteira do pago moram no banco, não no código.**
`app_settings` guarda o valor da assinatura e quem vê cada bloco do report; a
tela `/admin/plano` edita os dois. Mudar de ideia sobre quanto custa ou sobre o
que é grátis não pode exigir deploy — quem decide isso é o dono do produto, na
tela, não um commit.

**10. Só conteúdo editorial pode ser travado.**
Posição, régua, vetor, mapa, eixos, facetas e tensões saem sempre, para
qualquer pessoa: são resposta dela, e a LGPD art. 18 dá a ela direito de acesso
ao que é seu. O que se vende é o texto que nós escrevemos — descrição,
história, curiosidades, figuras, forças e fraquezas, ponto cego e países. A
lista travável vive em `BLOCOS`, em `netlify/functions/_lib/plano.js`; nenhum
campo entra lá sem passar por essa pergunta.

**11. A trava é do servidor.**
A primeira versão mandava o report inteiro e desfocava no CSS: parecia uma
fechadura e não era, bastava abrir o inspetor. `result-get` não envia o campo
travado, e o que a tela desenha por baixo do cartão é um esqueleto. Pelo mesmo
motivo `todos_arquetipos` sai resumido a id, nome, cor e centroide — mandar a
linha inteira entregaria pela porta ao lado o conteúdo travado na porta da
frente.

**12. Na comunidade, entrar e aparecer são dois sins.**
`group_members.shared` é o segundo: dá para estar na comunidade sem aparecer no
mapa, e voltar atrás quando quiser. Cada mudança escreve uma linha em
`consents` com finalidade `comunidade` — opinião política é dado sensível
(art. 11), e consentimento sensível precisa ser demonstrável com data, não
presumido pelo fato de a pessoa ter clicado em algum lugar. Quem não
compartilha não aparece para ninguém, nem para quem criou a comunidade; só
entra na contagem total, porque fingir que a pessoa não existe seria outra
mentira.

Recusa não é comunicada a quem convidou. O convite apenas deixa de estar
pendente. Dizer "fulano recusou" transforma uma resposta privada em
constrangimento social, e quem recusou não pediu para ter essa conversa.

**13. Criar comunidade é pago; entrar a convite é sempre de graça.**
A assimetria é o desenho, não um descuido. Se aceitar convite também custasse,
o convite morreria na caixa de entrada — e é justamente o amigo que entra sem
pagar, vê o mapa e quer o próprio que compra a anuidade seguinte. `podeUsar`
em `_lib/plano.js` decide, lendo `app_settings.recursos`, e a checagem é
refeita no servidor dentro da ação `criar`: esconder o formulário no front não
impede ninguém de chamar a Function direto.

**14. O centróide não se edita pela tela.**
`/admin/perfis` deixa reescrever nome, chamada, descrição, história,
curiosidades, figuras, forças, fraquezas, ponto cego e países — texto é texto,
e corrigir uma curiosidade não muda o resultado de ninguém. O centróide é
medida: mexer nele reclassifica em silêncio todo mundo que já respondeu,
inclusive o report que a pessoa já mandou para os amigos. É a decisão 8 pela
mesma razão, num objeto diferente. `admin-perfis` ignora `centroid`, `id` e
`instrument_id` mesmo que venham no corpo.

**15. Recorte de grupo sempre com o n do lado.**
A célula mínima de 100 (decisão 7) vale para o que sai publicado. Dentro do
admin, quem olha é o responsável pelos dados, e esconder o número atrapalharia
mais do que protegeria — mas número sozinho mente. `/admin/populacao` marca
todo recorte abaixo de 30 pessoas como amostra pequena, e diz quantos
resultados não entram em recorte nenhum por falta de perfil preenchido: sem
isso, um corte com quatro pessoas parece a população.

**16. Nada no `public` é legível pelo browser.**
Toda leitura passa por Function com `service_role`; o front não tem uma única
chamada `.from()`, e o client do Supabase no browser só faz login. As policies
de leitura pública que vieram do schema v1 foram removidas e o `SELECT` foi
revogado de `anon` e `authenticated`, inclusive no default de tabelas futuras.

Elas não eram teóricas. Rodando como `anon` — cuja chave é pública, está no
bundle — dava para ler `archetypes` inteiro, com `history`, `curiosities`,
`figures`, `strengths`, `weaknesses`, `blind_spots` e `countries`: exatamente o
conteúdo que a decisão 11 protege. Uma requisição HTTP passava por cima da
trava inteira. E `questions` entregava `direction`, `weight` e `intensity` — o
gabarito que `session-start` tem o cuidado de não mandar.

A lição que fica: **trava no servidor não vale nada enquanto existir outra
porta para o mesmo dado.** Ao fechar um caminho, procure os outros — foi o mesmo
erro do `todos_arquetipos` na decisão 11, repetido uma camada abaixo.

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

## Dívida aberta: seed x banco

O conteúdo rico dos arquétipos (`history`, `curiosities`, `figures`,
`strengths`, `weaknesses`, `countries`, `blind_spots`) foi gravado direto no
banco e **ainda não está no `seed.sql`**. É divergência conhecida, contra a
decisão 8, e a razão é só de ordem prática: o conteúdo está sendo escrito em
lotes, e gerar o seed a cada lote seria refazer o mesmo trabalho.

Fechar assim que os 12 perfis estiverem escritos: extrair do banco e gravar no
`seed.sql` de uma vez. Enquanto isso, `scripts/dev-server.mjs` mostra os perfis
sem o conteúdo rico, porque lê do seed — a página completa só aparece em
produção, contra o banco real.

---

## Pendente: envio de e-mail

`_lib/email.js` é a única porta para envio, no mesmo desenho do gateway de
pagamento. Sem `RESEND_API_KEY` nada é enviado, e o convite da comunidade vira
um link que quem convidou manda por WhatsApp ou pelo próprio e-mail. Isso não é
só contorno: convite que chega pelo WhatsApp de quem convidou é aceito muito
mais do que e-mail de remetente desconhecido — quando a chave existir, o e-mail
passa a sair *também*, e o link continua aparecendo na tela.

Falha de envio nunca derruba o convite: ele já existe no banco e o link
funciona.

---

## Pendente: meio de pagamento

A assinatura existe inteira — configuração, trava paga, histórico, cancelamento
e concessão manual pelo admin — menos a cobrança. `_lib/gateway.js` é a única
porta para o gateway: `criarCheckout` e `cancelarNoGateway` explodem com 501
enquanto Stripe ou Mercado Pago não forem escolhidos e as chaves não existirem.

Duas travas impedem que isso vire uma loja quebrada: `podeCobrar` exige a chave
no ambiente, e `plano.a_venda` só é verdadeiro com a venda ligada **e** um
gateway que pode cobrar. Ligar "à venda" no admin sem chave nenhuma não faz
aparecer botão de pagar para ninguém.

O gateway `manual` não é remendo de transição: cortesia para imprensa, teste
interno e reembolso vão continuar precisando de `/admin/assinantes` depois que a
cobrança real existir.
