-- I4 COMPAT, Opção C: onboarding transacional. Legado e backfill preservados.
begin;
-- Grants mínimos para service_role nas tabelas novas (EXPAND).
grant select, insert, update, delete on table
  public.sujeitos_publicadores,
  public.pessoas_fisicas,
  public.coletivos_informais,
  public.vinculos_publicadores,
  public.atestacoes_representacao,
  public.casos_moderacao
to service_role;

-- Funções de validação/integridade realmente criadas no EXPAND.
grant execute on function
  public.i4_escopos_validos(text[]),
  public.i4_sujeito_identidade(),
  public.i4_subtipo_completo(),
  public.i4_atividade_sujeito(),
  public.i4_vinculo_identidade(),
  public.i4_vinculo_integridade(),
  public.i4_pf_identidade(),
  public.i4_coletivo_curadoria(),
  public.i4_atestacao_integridade(),
  public.i4_caso_integridade()
to service_role;

create function public.criar_organizacao_com_sujeito(
  p_auth_user_id uuid, p_nome_publico text, p_canal_publico text
) returns uuid
language plpgsql security invoker set search_path = ''
as $$
declare
  v_organizacao uuid;
  v_conta uuid;
  v_sujeito uuid;
begin
  -- A RPC legada valida e serializa por identidade (advisory xact lock).
  -- Não capturar exceções: falha em qualquer insert desfaz também o legado.
  v_organizacao := public.criar_organizacao_pendente(p_auth_user_id,p_nome_publico,p_canal_publico);
  select id into strict v_conta from public.contas_acesso
    where auth_user_id=p_auth_user_id and organizacao_id=v_organizacao;

  -- Em retry, usar o nome persistido e preservar todo estado já existente.
  insert into public.sujeitos_publicadores
    (tipo,organizacao_legada_id,nome_publico,estado,modo_publicacao,risco,origem,criado_por_conta_id)
  select 'organizacao',o.id,o.nome_publico,'pendente','curadoria_previa','medio','cadastro',v_conta
    from public.organizacoes o where o.id=v_organizacao
    on conflict (organizacao_legada_id) do nothing;
  select id into strict v_sujeito from public.sujeitos_publicadores
    where organizacao_legada_id=v_organizacao;

  -- Nunca substituir/reabrir vínculo anterior, inclusive suspenso ou revogado.
  insert into public.vinculos_publicadores
    (sujeito_id,conta_id,papel_vinculo,escopos,situacao,origem,versao,atual,ativada_em)
  select v_sujeito,v_conta,'titular',array['ler_privado','editar','enviar','publicar','gerir_vinculo'],
    'ativo','cadastro',1,true,pg_catalog.now()
  where not exists (select 1 from public.vinculos_publicadores
    where sujeito_id=v_sujeito and conta_id=v_conta)
  on conflict (conta_id,sujeito_id) where atual do nothing;
  return v_organizacao;
end;
$$;
revoke all on function public.criar_organizacao_com_sujeito(uuid,text,text) from public,anon,authenticated;
grant execute on function public.criar_organizacao_com_sujeito(uuid,text,text) to service_role;
notify pgrst, 'reload schema';
commit;
