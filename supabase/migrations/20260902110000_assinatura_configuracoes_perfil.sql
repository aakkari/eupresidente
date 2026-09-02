-- Assinatura anual, configuracoes editaveis pelo admin e o restante dos dados
-- de perfil.
--
-- Tres decisoes ficam registradas aqui porque o codigo sozinho nao explica:
--
-- 1. O preco e a fronteira do que e pago NAO moram no codigo. Moram em
--    app_settings, editaveis na tela do admin. Mudar de ideia sobre preco ou
--    sobre o que e gratis nao pode exigir deploy.
--
-- 2. So conteudo editorial pode ficar atras do muro. Posicao, vetor, facetas e
--    tensoes sao dado da propria pessoa, e a LGPD art. 18 da a ela direito de
--    acesso ao que e dela — cobrar por isso e briga perdida. O que se cobra e
--    o texto que nos escrevemos: descricao, historia, curiosidades, figuras,
--    forcas e fraquezas, ponto cego e paises.
--
-- 3. Continua sem CPF (ver migration dados_do_perfil). O gateway guarda o
--    documento de quem paga; nos guardamos o id do cliente no gateway, nao o
--    documento. Identificador fiscal somado a opiniao politica e exatamente a
--    base que nao deve existir.

-- --------------------------------------------------------------- configuracao
create table app_settings (
  key        text        primary key,
  value      jsonb       not null,
  updated_at timestamptz not null default now(),
  updated_by uuid        references auth.users on delete set null
);

comment on table app_settings is
  'Configuracao que o admin edita na tela. Nunca lida pelo browser direto: '
  'as Functions leem com service_role e devolvem so o que cada tela precisa.';

insert into app_settings (key, value) values
  ('assinatura', jsonb_build_object(
    'ativa',           false,
    'gateway',         null,
    'preco_centavos',  4990,
    'moeda',           'BRL',
    'ciclo',           'anual',
    'titulo',          'Assinatura anual',
    'descricao',       'Acesso ao report completo por um ano.'
  )),
  -- Quem ve cada bloco editorial: 'todos', 'cadastrado' ou 'assinante'.
  -- O default deixa tudo em 'cadastrado', que e exatamente a trava que ja
  -- estava no ar antes desta migration — nada muda para quem ja usava.
  ('travas', jsonb_build_object(
    'descricao',    'todos',
    'historia',     'cadastrado',
    'curiosidades', 'cadastrado',
    'figuras',      'cadastrado',
    'forcas',       'cadastrado',
    'ponto_cego',   'cadastrado',
    'paises',       'cadastrado'
  ));

-- ----------------------------------------------------------------- assinatura
create table subscriptions (
  user_id                 uuid        primary key references auth.users on delete cascade,
  status                  text        not null default 'nenhuma'
                                      check (status in ('nenhuma','pendente','ativa','cancelada','vencida')),
  gateway                 text,
  gateway_customer_id     text,
  gateway_subscription_id text,
  period_start            timestamptz,
  period_end              timestamptz,
  cancel_at_period_end    boolean     not null default false,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

comment on column subscriptions.period_end is
  'Fim do periodo pago. Quem cancela continua com acesso ate aqui: cancelar '
  'nao e estorno, e nao renovar.';

create index subscriptions_status_idx on subscriptions (status, period_end);

create table payments (
  id                 uuid        primary key default gen_random_uuid(),
  user_id            uuid        not null references auth.users on delete cascade,
  amount_cents       integer     not null,
  currency           text        not null default 'BRL',
  status             text        not null
                                 check (status in ('pendente','pago','falhou','estornado')),
  gateway            text,
  gateway_payment_id text,
  method             text,
  receipt_url        text,
  paid_at            timestamptz,
  created_at         timestamptz not null default now()
);

comment on table payments is
  'Historico que a pessoa ve na conta. Espelho do gateway, nao a fonte da '
  'verdade: quem decide se o pagamento entrou e o webhook do gateway.';

create index payments_user_idx on payments (user_id, created_at desc);
create unique index payments_gateway_idx on payments (gateway, gateway_payment_id)
  where gateway_payment_id is not null;

-- --------------------------------------------------------------------- perfil
-- Ano de nascimento, e nao data: a faixa etaria da pesquisa sai igual do ano,
-- e dia e mes so aumentam o poder de reidentificacao de uma base que ja tem
-- opiniao politica dentro.
alter table profiles
  add column birth_year integer check (birth_year between 1900 and 2100),
  add column city       text,
  add column uf         text check (uf ~ '^[A-Z]{2}$'),
  add column education  text,
  add column occupation text;

comment on column profiles.birth_year is
  'Ano, nao data completa: mesma faixa etaria para a pesquisa, menos '
  'identificacao. Ver minimizacao no CLAUDE.md.';

-- ----------------------------------------------------------------------- rls
alter table app_settings  enable row level security;
alter table subscriptions enable row level security;
alter table payments      enable row level security;

-- Sem policy nenhuma: as tres tabelas so existem para as Functions, que usam
-- service_role. O browser nao le assinatura direto — se lesse, a pessoa
-- poderia inferir o estado a partir do que a tela desenha antes da resposta.
revoke all on app_settings  from anon, authenticated;
revoke all on subscriptions from anon, authenticated;
revoke all on payments      from anon, authenticated;
