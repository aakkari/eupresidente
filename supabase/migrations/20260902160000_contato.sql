-- Area de contato: mensagens que chegam do site e caem no admin.
create table contact_messages (
  id         uuid        primary key default gen_random_uuid(),
  name       text        not null,
  email      text        not null,
  subject    text,
  message    text        not null,
  -- Preenchido quando quem escreveu estava logado. Serve para o admin abrir a
  -- pessoa em Pessoas sem ter que casar email na mao.
  user_id    uuid        references auth.users(id) on delete set null,
  ip_hash    text,
  status     text        not null default 'novo'
                         check (status in ('novo','lido','respondido','arquivado')),
  created_at timestamptz not null default now(),
  handled_at timestamptz
);

comment on table contact_messages is
  'Chega por Function com rate limit por IP. O browser nao le nem escreve '
  'direto: caixa de entrada aberta para leitura seria lista de emails de graca.';

create index contact_messages_status_idx on contact_messages (status, created_at desc);

alter table contact_messages enable row level security;
revoke all on contact_messages from anon, authenticated;
