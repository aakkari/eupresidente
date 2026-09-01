-- Fundacao para o instrumento v2, o dashboard rico e os grupos de amigos.
-- Tudo aditivo: o br-v1 publicado continua funcionando sem alteracao.

-- ------------------------------------------------------------------ facetas
-- Um eixo medido por uma nota so nao da o que dizer sobre a pessoa. A faceta
-- subdivide o eixo: em vez de "Economia -0.83", vira "redistribuicao -0.9,
-- regulacao -0.7, propriedade estatal -0.4" — que e onde mora a nuance.
alter table instruments add column if not exists facets jsonb not null default '{}'::jsonb;
alter table questions   add column if not exists facet  text;
create index if not exists questions_facet_idx on questions (instrument_id, axis, facet);

-- results.vector continua sendo o vetor por eixo (o que classifica o
-- arquetipo). O detalhe por faceta fica separado para nao mudar o contrato
-- de nada que ja le vector.
alter table results add column if not exists facet_vector jsonb not null default '{}'::jsonb;

-- ---------------------------------------------------------------- demografia
-- Separada de sessions e results de proposito. Profissao + estado + opiniao
-- politica, na mesma linha, identificam pessoas: "engenheiro, 30-39, Acre"
-- pode ser uma pessoa so. Aqui fica o dado ligado a sessao, para a pessoa ver
-- o proprio recorte; a comparacao publica sai sempre do research_pool anonimo,
-- com celula minima de 100.
create table if not exists demographics (
  session_id     uuid primary key references sessions(id) on delete cascade,
  region_uf      text,
  age_band       text,
  education_band text,
  income_band    text,
  gender         text,
  occupation     text,
  religion       text,
  vote_2022      text,
  collected_at   timestamptz not null default now()
);
comment on table demographics is
  'Ligada a sessao e apagavel com ela. Nunca juntar com research_pool: e o cruzamento que re-identifica.';
alter table demographics enable row level security;

-- ------------------------------------------------- conteudo rico do arquetipo
-- O que hoje e um paragrafo fixo vira material de dashboard: de onde a
-- tradicao veio, quem a encarnou, no que ela e forte e onde costuma falhar.
alter table archetypes add column if not exists history      text;
alter table archetypes add column if not exists curiosities  jsonb not null default '[]'::jsonb;
alter table archetypes add column if not exists figures      jsonb not null default '[]'::jsonb;
alter table archetypes add column if not exists strengths    jsonb not null default '[]'::jsonb;
alter table archetypes add column if not exists weaknesses   jsonb not null default '[]'::jsonb;
alter table archetypes add column if not exists countries    jsonb not null default '[]'::jsonb;
alter table archetypes add column if not exists blind_spots  text;

comment on column archetypes.figures is
  'Figuras historicas: [{"nome":..., "periodo":..., "nota":...}]. Pessoas mortas ou papel publico — nunca atribuir arquetipo a pessoa viva sem declaracao propria.';
comment on column archetypes.countries is
  'Referencia internacional: [{"pais":..., "partido":..., "nota":...}]. Curado, nao coletado — funciona desde o primeiro usuario, sem depender de N.';

-- ------------------------------------------------------- perfis e amizades
-- Conta opcional. Responder continua sem cadastro: a conta serve para guardar
-- resultados, comparar com amigos e voltar depois.
create table if not exists profiles (
  user_id      uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_seed  text,
  created_at   timestamptz not null default now()
);
alter table profiles enable row level security;

create table if not exists groups (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  owner_id    uuid not null references auth.users(id) on delete cascade,
  invite_code text not null unique,
  created_at  timestamptz not null default now()
);
alter table groups enable row level security;
create index if not exists groups_owner_idx on groups (owner_id);

create table if not exists group_members (
  group_id   uuid not null references groups(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  result_id  uuid references results(id) on delete set null,
  -- Entrar no grupo nao expoe o vetor. Comparar exige um segundo sim.
  shared     boolean not null default false,
  joined_at  timestamptz not null default now(),
  primary key (group_id, user_id)
);
comment on column group_members.shared is
  'Consentimento por grupo. Entrar e uma coisa; deixar os outros verem suas posicoes e outra.';
alter table group_members enable row level security;

-- Leitura propria. Escrita continua sendo so por Function com service_role.
create policy own_read_profiles on profiles for select to authenticated
  using (user_id = auth.uid());

create policy own_read_demographics on demographics for select to authenticated
  using (exists (select 1 from sessions s where s.id = demographics.session_id and s.user_id = auth.uid()));

create policy member_read_groups on groups for select to authenticated
  using (exists (select 1 from group_members m where m.group_id = groups.id and m.user_id = auth.uid()));

-- Voce ve os membros dos seus grupos, e so os que liberaram comparacao —
-- alem de voce mesmo, sempre.
create policy member_read_members on group_members for select to authenticated
  using (
    exists (select 1 from group_members meu
            where meu.group_id = group_members.group_id and meu.user_id = auth.uid())
    and (group_members.shared or group_members.user_id = auth.uid())
  );

revoke insert, update, delete, truncate on all tables in schema public
  from anon, authenticated;
