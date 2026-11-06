-- Onboarding PF. Somente o backend invoca após verificar identidade/e-mail no Auth.
-- Não concede publicação nem altera políticas/grants de tabelas existentes.
begin;
create function public.criar_pf_com_sujeito(p_auth_user_id uuid,p_nome_publico text)
returns uuid language plpgsql security invoker set search_path = ''
as $$
declare
  v_conta public.contas_acesso%rowtype;
  v_sujeito uuid;
  v_nome text;
begin
  v_nome := normalize(pg_catalog.btrim(p_nome_publico), NFC);
  if p_auth_user_id is null or v_nome is null
    or pg_catalog.char_length(v_nome) not between 2 and 160
    or v_nome ~ '[<>[:cntrl:]]' then
    raise exception using errcode='22023',message='Cadastro PF inválido.';
  end if;
  -- Mesmo protocolo do onboarding organizacional, inclusive antes de existir conta.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_auth_user_id::text,0));
  select * into v_conta from public.contas_acesso where auth_user_id=p_auth_user_id for update;
  if found then
    if v_conta.papel <> 'publicador' or v_conta.situacao <> 'ativa' or v_conta.organizacao_id is not null then
      raise exception using errcode='42501',message='Vínculo PF indisponível.';
    end if;
    select s.id into v_sujeito from public.pessoas_fisicas p
      join public.sujeitos_publicadores s on s.id=p.sujeito_id
      where p.conta_id=v_conta.id and s.tipo='pessoa_fisica' and s.criado_por_conta_id=v_conta.id;
    if not found then
      raise exception using errcode='42501',message='Vínculo PF indisponível.';
    end if;
    return v_sujeito; -- Retry não altera nome, curadoria, papel ou vínculo anterior.
  end if;
  insert into public.contas_acesso(auth_user_id,papel,situacao,organizacao_id,ativa_desde)
    values(p_auth_user_id,'publicador','ativa',null,pg_catalog.now()) returning * into v_conta;
  insert into public.sujeitos_publicadores
    (tipo,organizacao_legada_id,nome_publico,estado,modo_publicacao,risco,origem,criado_por_conta_id)
    values('pessoa_fisica',null,v_nome,'pendente','curadoria_previa','medio','cadastro',v_conta.id)
    returning id into v_sujeito;
  insert into public.pessoas_fisicas(sujeito_id,conta_id) values(v_sujeito,v_conta.id);
  insert into public.vinculos_publicadores
    (sujeito_id,conta_id,papel_vinculo,escopos,situacao,origem,versao,atual,ativada_em)
    values(v_sujeito,v_conta.id,'titular',array['ler_privado','editar','enviar'],'ativo','cadastro',1,true,pg_catalog.now());
  return v_sujeito;
end;
$$;
revoke all on function public.criar_pf_com_sujeito(uuid,text) from public,anon,authenticated;
grant execute on function public.criar_pf_com_sujeito(uuid,text) to service_role;
notify pgrst, 'reload schema';
commit;
