-- Gravacao das respostas em uma unica chamada, direto no Postgres.
--
-- Antes isso passava pelo upsert do PostgREST sobre a tabela particionada.
-- Aqui o ON CONFLICT roda no banco, onde ja esta provado que funciona, e a
-- Function faz uma round-trip em vez de duas. Tambem valida question_id
-- contra o instrumento: id inexistente e descartado em vez de estourar FK.
create or replace function public.save_responses(p_token uuid, p_respostas jsonb)
returns integer language plpgsql security definer set search_path = public as $function$
declare
  v_session uuid;
  v_count   integer;
begin
  select id into v_session
  from sessions
  where token = p_token and status = 'in_progress';

  if v_session is null then
    raise exception 'sessao nao encontrada ou ja encerrada';
  end if;

  insert into responses (session_id, question_id, value, answered_at)
  select v_session,
         r->>'question_id',
         (r->>'value')::smallint,
         coalesce((r->>'answered_at')::timestamptz, now())
  from jsonb_array_elements(p_respostas) r
  where (r->>'value') ~ '^-?[0-2]$'
    and exists (select 1 from questions q where q.id = r->>'question_id')
  on conflict (session_id, question_id)
    do update set value = excluded.value, answered_at = excluded.answered_at;

  get diagnostics v_count = row_count;
  return v_count;
end $function$;

revoke execute on function public.save_responses(uuid, jsonb) from public, anon, authenticated;
