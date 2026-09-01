-- EU PRESIDENTE — schema v1
-- Fonte unica da verdade. O banco e consequencia deste arquivo, nunca o contrario.
--
-- Decisoes travadas (ver CLAUDE.md):
--   1. O browser NUNCA escreve. Nenhuma policy de INSERT/UPDATE/DELETE existe.
--      Toda escrita passa por Netlify Function com service_role.
--   2. O LLM NUNCA classifica. results e sempre deterministico.
--   3. Versao curta NAO alimenta a base de pesquisa.

-- ---------------------------------------------------------------- instrumento

create table instruments (
  id            text primary key,
  label         text        not null,
  axes          jsonb       not null,
  axis_weights  jsonb       not null,
  active        boolean     not null default false,
  created_at    timestamptz not null default now()
);
comment on table instruments is
  'Versionamento do instrumento. Nunca editar uma versão publicada — criar v2.';

create table archetypes (
  id              text primary key,
  instrument_id   text    not null references instruments(id),
  name            text    not null,
  tagline         text    not null,
  description     text    not null,
  schools         text[]  not null default '{}',
  centroid        jsonb   not null,
  available_short boolean not null default true,
  color           text    not null
);

create table questions (
  id               text primary key,
  instrument_id    text         not null references instruments(id),
  block            text         not null,
  ord              integer      not null,
  axis             text         not null,
  direction        smallint     not null check (direction in (-1, 1)),
  weight           numeric(3,2) not null check (weight > 0),
  secondary_axis   text,
  secondary_weight numeric(3,2),
  body             text         not null,
  in_short         boolean      not null default false,
  in_long          boolean      not null default true,
  attention_pair   text,
  scored           boolean      not null default true,
  unique (instrument_id, block, ord)
);

-- ------------------------------------------------------------------ execucao

create table sessions (
  id            uuid primary key default gen_random_uuid(),
  token         uuid        not null unique default gen_random_uuid(),
  instrument_id text        not null references instruments(id),
  mode          text        not null check (mode in ('short','long')),
  status        text        not null default 'in_progress'
                  check (status in ('in_progress','completed','abandoned')),
  user_id       uuid        references auth.users(id) on delete cascade,
  ip_hash       text,
  ua_hash       text,
  utm           jsonb,
  started_at    timestamptz not null default now(),
  completed_at  timestamptz,
  claimed_at    timestamptz
);
create index sessions_token_idx  on sessions (token);
create index sessions_user_idx   on sessions (user_id) where user_id is not null;
create index sessions_status_idx on sessions (status, started_at desc);
create index sessions_iphash_idx on sessions (ip_hash, started_at desc);

create table responses (
  session_id  uuid        not null references sessions(id) on delete cascade,
  question_id text        not null references questions(id),
  value       smallint    not null check (value between -2 and 2),
  answered_at timestamptz not null default now(),
  primary key (session_id, question_id)
) partition by hash (session_id);

do $$ begin
  for i in 0..15 loop
    execute format(
      'create table responses_p%s partition of responses for values with (modulus 16, remainder %s)',
      i, i);
  end loop;
end $$;

-- ----------------------------------------------------------------- resultado

create table results (
  id                     uuid         primary key default gen_random_uuid(),
  session_id             uuid         not null unique references sessions(id) on delete cascade,
  instrument_id          text         not null references instruments(id),
  vector                 jsonb        not null,
  confidence             jsonb        not null,
  consistency            jsonb        not null,
  neutral_rate           numeric(4,3) not null check (neutral_rate between 0 and 1),
  archetype_id           text         not null references archetypes(id),
  archetype_secondary_id text         references archetypes(id),
  archetype_distance     numeric(5,4),
  tensions               text[]       not null default '{}',
  quality_flags          text[]       not null default '{}',
  quality_metrics        jsonb        not null default '{}',
  research_eligible      boolean      not null default false,
  computed_at            timestamptz  not null default now()
);
comment on table results is 'Sempre deterministico. O LLM nunca escreve aqui.';

create table reports (
  id             uuid         primary key default gen_random_uuid(),
  result_id      uuid         not null unique references results(id) on delete cascade,
  model          text         not null,
  prompt_version text         not null,
  opening        text         not null,
  tension_blocks jsonb        not null,
  input_tokens   integer,
  output_tokens  integer,
  cost_usd       numeric(8,5),
  generated_at   timestamptz  not null default now()
);
comment on table reports is
  'Gerado uma vez, nunca regerado. unique(result_id) e a trava de custo.';

-- ---------------------------------------------------------------- LGPD

create table consents (
  id             uuid        primary key default gen_random_uuid(),
  user_id        uuid        references auth.users(id) on delete cascade,
  session_id     uuid        references sessions(id) on delete cascade,
  purpose        text        not null
                   check (purpose in ('perfil_individual','pesquisa_agregada','comunicacao_email')),
  granted        boolean     not null,
  policy_version text        not null,
  granted_at     timestamptz not null default now(),
  revoked_at     timestamptz,
  check (user_id is not null or session_id is not null)
);
comment on table consents is
  'Uma linha por finalidade. Opiniao politica e dado sensivel (LGPD art. 5 II); legitimo interesse nao serve como base legal (art. 11).';
create index consents_user_idx on consents (user_id, purpose) where revoked_at is null;

create table research_pool (
  id             uuid        primary key default gen_random_uuid(),
  instrument_id  text        not null,
  mode           text        not null,
  vector         jsonb       not null,
  archetype_id   text        not null,
  tensions       text[]      not null default '{}',
  answers        jsonb       not null,
  region_uf      text,
  age_band       text,
  education_band text,
  income_band    text,
  gender         text,
  inserted_at    timestamptz not null default now()
);
comment on table research_pool is
  'SEM foreign key para sessions ou auth.users. Intencional e irreversivel. Nunca adicionar coluna que permita re-identificacao.';
create index research_pool_arch_idx   on research_pool (archetype_id);
create index research_pool_region_idx on research_pool (region_uf);

-- --------------------------------------------------------- social e operacao

create table comparisons (
  id              uuid         primary key default gen_random_uuid(),
  slug            text         not null unique,
  owner_result_id uuid         not null references results(id) on delete cascade,
  guest_result_id uuid         references results(id) on delete cascade,
  agreement       numeric(4,3),
  biggest_gap_axis text,
  created_at      timestamptz  not null default now(),
  expires_at      timestamptz  not null default (now() + interval '30 days')
);
create index comparisons_owner_idx on comparisons (owner_result_id);

create table aggregate_snapshots (
  id           uuid        primary key default gen_random_uuid(),
  cut_key      text        not null,
  cut_value    jsonb       not null,
  n            integer     not null,
  payload      jsonb       not null,
  refreshed_at timestamptz not null default now(),
  unique (cut_key, cut_value),
  constraint min_cell_size check (n >= 100)
);

create table rate_limits (
  key          text        primary key,
  count        integer     not null default 1,
  window_start timestamptz not null default now()
);

-- ----------------------------------------------------------------- funcoes

-- Vincula uma sessao anonima ja concluida a um usuario que criou conta depois.
create or replace function public.claim_session(p_token uuid, p_user_id uuid)
returns uuid language plpgsql security definer set search_path = public as $function$
declare v_id uuid;
begin
  update sessions
     set user_id = p_user_id, claimed_at = now()
   where token = p_token and user_id is null and status = 'completed'
  returning id into v_id;

  if v_id is null then
    raise exception 'sessao invalida, ja vinculada ou incompleta';
  end if;

  return v_id;
end $function$;

-- Heuristicas de qualidade da resposta. Alimenta results.quality_flags.
create or replace function public.detect_quality_flags(p_session_id uuid)
returns text[] language plpgsql security definer set search_path = public as $function$
declare
  v_flags       text[] := '{}';
  v_median_gap  numeric;
  v_modal_share numeric;
  v_ac_fail     int;
  v_replays     int;
  v_ip          text;
begin
  select percentile_cont(0.5) within group (order by gap)
    into v_median_gap
  from (
    select extract(epoch from answered_at - lag(answered_at) over (order by answered_at)) as gap
    from responses where session_id = p_session_id
  ) t where gap is not null;

  if v_median_gap is not null and v_median_gap < 2.0 then
    v_flags := v_flags || 'fast';
  end if;

  select max(c)::numeric / nullif(sum(c), 0)
    into v_modal_share
  from (select count(*) c from responses where session_id = p_session_id group by value) t;

  if v_modal_share > 0.70 then
    v_flags := v_flags || 'straightline';
  end if;

  select count(*) into v_ac_fail
  from (
    select q.attention_pair
    from responses r join questions q on q.id = r.question_id
    where r.session_id = p_session_id and q.attention_pair is not null
    group by q.attention_pair
    having min(r.value) >= 1 or max(r.value) <= -1
  ) t;

  if v_ac_fail > 0 then
    v_flags := v_flags || 'attention_fail';
  end if;

  select ip_hash into v_ip from sessions where id = p_session_id;

  if v_ip is not null then
    select count(*) into v_replays
    from sessions
    where ip_hash = v_ip and status = 'completed'
      and completed_at > now() - interval '24 hours'
      and id <> p_session_id;

    if v_replays >= 2 then
      v_flags := v_flags || 'replay';
    end if;
  end if;

  return v_flags;
end $function$;

-- Copia um resultado elegivel para a base de pesquisa, SEM vinculo com a pessoa.
-- CORRECAO v1: alias s.mode as s_mode. Sem ele, o record misturava campos —
-- results nao tem coluna mode e o select res.*, s.mode colidia.
create or replace function public.ingest_research(p_result_id uuid, p_demographics jsonb)
returns void language plpgsql security definer set search_path = public as $function$
declare r record;
begin
  select res.*, s.mode as s_mode, s.id as sid
    into r
  from results res join sessions s on s.id = res.session_id
  where res.id = p_result_id;

  if not found or not r.research_eligible then
    return;
  end if;

  insert into research_pool (
    instrument_id, mode, vector, archetype_id, tensions, answers,
    region_uf, age_band, education_band, income_band, gender)
  select
    r.instrument_id, r.s_mode, r.vector, r.archetype_id, r.tensions,
    (select jsonb_object_agg(question_id, value) from responses where session_id = r.sid),
    p_demographics->>'region_uf',
    p_demographics->>'age_band',
    p_demographics->>'education_band',
    p_demographics->>'income_band',
    p_demographics->>'gender';
end $function$;

-- Direito de eliminacao (LGPD art. 18 VI). research_pool nao e tocado: e anonimo
-- e nao ha como localizar a linha da pessoa — por desenho, nao por descuido.
-- CORRECAO v1: search_path inclui auth. Sem isso a funcao nao enxerga auth.users
-- e a exclusao do titular falharia silenciosamente.
create or replace function public.purge_user(p_user_id uuid)
returns void language plpgsql security definer set search_path = public, auth as $function$
begin
  delete from sessions where user_id = p_user_id;
  delete from consents  where user_id = p_user_id;
  delete from auth.users where id = p_user_id;
end $function$;

-- --------------------------------------------------------------------- RLS

alter table instruments         enable row level security;
alter table archetypes          enable row level security;
alter table questions           enable row level security;
alter table sessions            enable row level security;
alter table responses           enable row level security;
alter table results             enable row level security;
alter table reports             enable row level security;
alter table consents            enable row level security;
alter table research_pool       enable row level security;
alter table comparisons         enable row level security;
alter table aggregate_snapshots enable row level security;
alter table rate_limits         enable row level security;

-- CORRECAO v1 — furo de seguranca real, encontrado com o banco ainda vazio.
-- RLS na tabela pai so vale quando a query passa pelo pai. O PostgREST expoe
-- cada particao como tabela propria: GET /rest/v1/responses_p3 com a anon key
-- lia e apagava tudo, ignorando as 9 policies. Duas camadas de correcao:
--   1. RLS na particao, sem policy → acesso direto e negado por default deny;
--      o acesso via responses continua obedecendo as policies do pai.
--   2. REVOKE → tira a particao do alcance do PostgREST.
do $$ begin
  for i in 0..15 loop
    execute format('alter table responses_p%s enable row level security', i);
    execute format('revoke all on responses_p%s from anon, authenticated', i);
  end loop;
end $$;

-- Leitura publica: o instrumento ativo e os agregados.
create policy pub_read_instruments on instruments for select to anon, authenticated
  using (active = true);

create policy pub_read_questions on questions for select to anon, authenticated
  using (exists (select 1 from instruments i where i.id = questions.instrument_id and i.active));

create policy pub_read_archetypes on archetypes for select to anon, authenticated
  using (exists (select 1 from instruments i where i.id = archetypes.instrument_id and i.active));

create policy pub_read_aggregates on aggregate_snapshots for select to anon, authenticated
  using (true);

-- Leitura propria: cada pessoa ve o que e dela, e nada mais.
create policy own_read_sessions on sessions for select to authenticated
  using (user_id = auth.uid());

create policy own_read_responses on responses for select to authenticated
  using (exists (select 1 from sessions s where s.id = responses.session_id and s.user_id = auth.uid()));

create policy own_read_results on results for select to authenticated
  using (exists (select 1 from sessions s where s.id = results.session_id and s.user_id = auth.uid()));

create policy own_read_reports on reports for select to authenticated
  using (exists (select 1 from results r join sessions s on s.id = r.session_id
                 where r.id = reports.result_id and s.user_id = auth.uid()));

create policy own_read_consents on consents for select to authenticated
  using (user_id = auth.uid());

-- research_pool, comparisons, rate_limits: sem policy. Apenas service_role.
-- research_pool ficar sem leitura publica e proposital — o cruzamento de
-- vector + demografia re-identifica em celula pequena.

-- ------------------------------------------------------------------ grants
-- Defesa em profundidade: nenhuma policy de escrita existe, entao o RLS ja
-- barra. Revogar o grant torna o desenho explicito — se alguem criar uma
-- policy de INSERT por engano, o browser continua sem conseguir escrever.
revoke insert, update, delete, truncate on all tables in schema public
  from anon, authenticated;
