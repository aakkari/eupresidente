-- Comunidade: convite por email, aceite explicito e mapa com nomes.
--
-- As tabelas groups e group_members ja existiam vazias. O que faltava era o
-- convite e, principalmente, o momento do sim: um grupo onde entrar ja expoe a
-- posicao de todo mundo nao tem consentimento, tem inercia.

-- ------------------------------------------------------------------ convites
create table group_invites (
  id           uuid        primary key default gen_random_uuid(),
  group_id     uuid        not null references groups(id) on delete cascade,
  email        text        not null,
  invited_by   uuid        not null references auth.users(id) on delete cascade,
  token        uuid        not null unique default gen_random_uuid(),
  status       text        not null default 'pendente'
                           check (status in ('pendente','aceito','recusado','cancelado')),
  created_at   timestamptz not null default now(),
  responded_at timestamptz
);

comment on table group_invites is
  'O token e a credencial do convite, como no resultado. Convidar por email nao '
  'revela se aquele email tem conta — quem nao tem se cadastra e ai aceita.';

-- Um convite pendente por email e por grupo. Sem isso, clicar duas vezes em
-- "convidar" gera dois links validos para a mesma pessoa.
create unique index group_invites_pendente_idx
  on group_invites (group_id, lower(email)) where status = 'pendente';
create index group_invites_email_idx on group_invites (lower(email)) where status = 'pendente';
create index group_invites_group_idx on group_invites (group_id);

-- ---------------------------------------------------------------- consentimento
-- Compartilhar posicao politica com um grupo de pessoas identificadas e uma
-- finalidade propria: nao esta coberta por 'perfil_individual' (o proprio
-- relatorio) nem por 'pesquisa_agregada' (numero sem nome). Precisa da sua
-- propria linha, com data e versao da politica, para ser demonstravel.
alter table consents drop constraint consents_purpose_check;
alter table consents add constraint consents_purpose_check
  check (purpose in ('perfil_individual','pesquisa_agregada','comunicacao_email','comunidade'));

-- --------------------------------------------------------------------- membros
-- O mapa mostra sempre o resultado mais recente de cada pessoa. Guardar um id
-- fixo congelaria a foto: quem respondesse de novo e mudasse de posicao
-- continuaria aparecendo para a comunidade onde nao esta mais.
alter table group_members drop column result_id;

comment on table group_members is
  'Uma linha por pessoa por comunidade. shared e o segundo sim: da para ficar '
  'na comunidade sem aparecer no mapa, e voltar atras a qualquer momento.';

-- ------------------------------------------------------------------------- rls
alter table group_invites enable row level security;

-- A policy antiga de group_members consultava group_members dentro do proprio
-- USING — recursao infinita, que so nao estourou porque toda leitura passa por
-- Function com service_role. Em vez de reescrever uma policy que ninguem usa,
-- fechamos a leitura direta: a regra de quem ve quem depende de shared e de
-- pertencimento, e ela mora na Function, explicita e testavel.
drop policy if exists member_read_members on group_members;
drop policy if exists member_read_groups  on groups;

revoke select on groups, group_members, group_invites from anon, authenticated;

revoke insert, update, delete, truncate on all tables in schema public
  from anon, authenticated;
