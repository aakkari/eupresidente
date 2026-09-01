-- CORRECAO — furo de seguranca encontrado pelo advisor apos aplicar a v1.
--
-- As 4 funcoes sao SECURITY DEFINER e o PostgREST expoe cada uma como
-- /rest/v1/rpc/<nome>. Em Postgres, EXECUTE e concedido a PUBLIC por padrao,
-- e SECURITY DEFINER faz a funcao rodar como dona do banco. Resultado:
--
--   POST /rest/v1/rpc/purge_user {"p_user_id": "<qualquer uuid>"}
--
-- com a anon key — que por definicao vai no JavaScript do navegador — apagava
-- sessions, consents e a linha em auth.users de qualquer pessoa. claim_session
-- permitia vincular uma sessao alheia a si mesmo.
--
-- As quatro sao chamadas apenas por Netlify Function com service_role, que
-- ignora RLS e grants. Nenhuma precisa ser alcancavel pelo browser.

revoke execute on function public.claim_session(uuid, uuid)    from public, anon, authenticated;
revoke execute on function public.detect_quality_flags(uuid)   from public, anon, authenticated;
revoke execute on function public.ingest_research(uuid, jsonb) from public, anon, authenticated;
revoke execute on function public.purge_user(uuid)             from public, anon, authenticated;

-- Novas funcoes nascem sem EXECUTE para os papeis do browser.
alter default privileges in schema public revoke execute on functions from anon, authenticated;
