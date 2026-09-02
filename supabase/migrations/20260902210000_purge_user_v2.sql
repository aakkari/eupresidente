-- Apagar a conta, de verdade e sem levar terceiro junto.
--
-- A versao anterior apagava sessions, consents e auth.users, e deixava o
-- cascade resolver o resto. O cascade resolvia demais: groups.owner_id aponta
-- para auth.users com on delete cascade, entao quem criou uma comunidade e
-- pedia para sair do sistema levava a comunidade inteira — e as outras cinco
-- pessoas perdiam o mapa delas sem terem pedido nada.
--
-- Aqui a comunidade com gente dentro troca de dono para o membro mais antigo
-- que sobra. So some a que ficaria vazia.
create or replace function public.purge_user(p_user_id uuid)
returns void language plpgsql security definer set search_path to 'public', 'auth' as $function$
declare
  g record;
  v_novo uuid;
begin
  -- 1. Comunidades que a pessoa criou.
  for g in select id from groups where owner_id = p_user_id loop
    select user_id into v_novo
    from group_members
    where group_id = g.id and user_id <> p_user_id
    order by joined_at
    limit 1;

    if v_novo is null then
      delete from groups where id = g.id;   -- ficaria vazia
    else
      update groups set owner_id = v_novo where id = g.id;
    end if;
  end loop;

  -- 2. Sai das comunidades das quais participa.
  delete from group_members where user_id = p_user_id;

  -- 3. Convites pendentes endereçados a ela deixam de existir: o email vai
  --    embora, e um convite para um endereco sem dono e lixo com dado dentro.
  delete from group_invites
  where invited_by = p_user_id
     or lower(email) in (select lower(email) from auth.users where id = p_user_id);

  -- 4. Mensagens de contato: apagar e apagar. Elas guardam nome e email
  --    escritos pela propria pessoa, e manter "para historico" seria manter
  --    exatamente o que ela pediu para sumir.
  delete from contact_messages
  where user_id = p_user_id
     or lower(email) in (select lower(email) from auth.users where id = p_user_id);

  -- 5. Assinatura e espelho de pagamentos. O extrato fiscal e do gateway, nao
  --    nosso; aqui e copia.
  delete from payments      where user_id = p_user_id;
  delete from subscriptions where user_id = p_user_id;

  -- 6. Sessoes levam junto respostas, resultados, relatorios, consentimentos
  --    de sessao, demografia e comparacoes, por cascade.
  delete from sessions where user_id = p_user_id;
  delete from consents where user_id = p_user_id;

  -- 7. E a conta. profiles cai por cascade.
  delete from auth.users where id = p_user_id;

  -- research_pool nao entra: ela e anonima e nao tem chave estrangeira para a
  -- conta (decisao 4). Nao existe "a linha dela" para localizar — e a tela diz
  -- isso, em vez de deixar a pessoa supor que existe e nao apagamos.
end $function$;

revoke execute on function public.purge_user(uuid) from public, anon, authenticated;
