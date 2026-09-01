# EU PRESIDENTE

Instrumento de autoconhecimento politico: seis eixos, 12 arquetipos, relatorio
que explica cada principio e compara com escolas de pensamento e outros paises.

As decisoes de arquitetura que nao devem ser revertidas por engano estao em
[CLAUDE.md](./CLAUDE.md). Leia antes de mexer.

## Rodar local

```bash
npm install
cp .env.example .env        # preencher as chaves
npx netlify dev             # front + functions juntos, em :8888
```

`npm run dev` sobe so o Vite — as Functions nao respondem, entao o questionario
nao funciona. Use `netlify dev`.

## Variaveis de ambiente

| Variavel | Onde | Para que |
|---|---|---|
| `VITE_SUPABASE_URL` | browser | login do admin |
| `VITE_SUPABASE_ANON_KEY` | browser | login do admin |
| `SUPABASE_URL` | function | acesso ao banco |
| `SUPABASE_SERVICE_ROLE_KEY` | function | **secreta** — ignora RLS |
| `ADMIN_EMAILS` | function | lista separada por virgula |
| `IP_SALT` | function | hash de IP para deteccao de replay |

`SUPABASE_SERVICE_ROLE_KEY` nunca leva prefixo `VITE_`. O prefixo publica a
variavel no bundle do browser, e essa chave ignora RLS e todos os grants.

## Estrutura

```
src/pages/            Home, Quiz, Resultado
src/pages/admin/      revisao de perguntas e metricas do instrumento
netlify/functions/    toda escrita e todo calculo
  _lib/scoring.js     o motor deterministico
supabase/migrations/  schema versionado
supabase/seed.sql     instrumento v1
scripts/              validacao do instrumento
```

## Fluxo

1. `session-start` cria a sessao anonima e devolve as perguntas — sem direcao
   nem peso, que ficam no servidor: quem enxerga o gabarito fabrica o resultado.
2. `session-answer` grava em lote, idempotente por `(sessao, pergunta)`.
3. `session-finish` calcula vetor, confianca, consistencia e arquetipo, roda as
   heuristicas de qualidade e, se houver consentimento e a resposta estiver
   limpa, copia para a base de pesquisa.
4. `result-get` le pelo token da sessao.

## Validar o instrumento

```bash
node scripts/validar-instrumento.mjs
```

Simula, para cada arquetipo, alguem que responde exatamente como aquele
centroide, e confere se o motor devolve o mesmo arquetipo. Arquetipo que nao se
recupera esta mal posicionado — nenhuma resposta possivel chega ate ele.
Rode sempre que mexer em centroide, peso ou direcao.

Estado atual: **12/12 na versao longa, 8/8 na curta.**

## Admin

`/admin`, com conta do Supabase Auth cujo email esteja em `ADMIN_EMAILS`. A
autorizacao acontece no servidor, em cada Function — a tela so evita mostrar
painel vazio.

Instrumento publicado nao pode ser editado, e a Function recusa a alteracao.
Para mudar, clone em v2 pelo proprio painel: perguntas e arquetipos sao
copiados com ids prefixados, a v2 nasce inativa e a v1 continua no ar ate voce
publicar a nova.
