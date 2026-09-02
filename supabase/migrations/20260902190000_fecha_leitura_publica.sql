-- Fecha a leitura direta pelo PostgREST.
--
-- O schema v1 nasceu com policies de leitura publica em archetypes, questions,
-- instruments e aggregate_snapshots — de um desenho anterior, em que o browser
-- leria o instrumento direto do banco. Esse desenho morreu na decisao 1 (o
-- browser nunca escreve) e em "o gabarito nao vai para o browser": hoje TODA
-- leitura passa por Netlify Function com service_role, e o front nao tem uma
-- unica chamada .from() — o client do Supabase no browser so faz login.
--
-- As policies ficaram, e viraram dois furos serios, os dois demonstrados
-- rodando como a role anon (cuja chave e publica, esta no bundle JS):
--
-- 1. archetypes com leitura publica entregava history, curiosities, figures,
--    strengths, weaknesses, blind_spots e countries — exatamente o conteudo
--    editorial que a trava de assinatura protege. Uma requisicao HTTP passava
--    por cima da decisao 11 inteira.
--
-- 2. questions com leitura publica entregava direction, weight, intensity e
--    facet: o gabarito. session-start tem o cuidado de nao mandar esses campos,
--    e o PostgREST distribuia de graca pela porta ao lado.
--
-- A correcao e tirar o acesso, e nao filtrar coluna: nada no browser le tabela,
-- entao a superficie certa e zero.
drop policy if exists pub_read_archetypes  on archetypes;
drop policy if exists pub_read_questions   on questions;
drop policy if exists pub_read_instruments on instruments;
drop policy if exists pub_read_aggregates  on aggregate_snapshots;

-- Defesa em profundidade: sem o grant, uma policy criada por engano no futuro
-- nao reabre a porta sozinha.
revoke select on all tables in schema public from anon, authenticated;

-- E o padrao para tabela nova: nasce fechada.
alter default privileges in schema public
  revoke select on tables from anon, authenticated;
