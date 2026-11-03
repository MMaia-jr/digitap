-- Incremento 2. PREPARADA, NÃO APLICADA: Docker permanece bloqueado.
-- Invocação exclusiva do backend após Auth.getUser + email confirmado.
-- Não há transação distribuída com Auth: identidade pode existir sem vínculo,
-- e a própria pessoa pode retomar este passo após autenticar novamente.
begin;
create function public.criar_organizacao_pendente(p_auth_user_id uuid,p_nome_publico text,p_canal_publico text default null)
returns uuid language plpgsql security invoker set search_path=''
as $$
declare v_conta public.contas_acesso%rowtype; v_organizacao uuid;
begin
 if p_auth_user_id is null or p_nome_publico is null or char_length(trim(p_nome_publico)) not between 2 and 160 then
   raise exception using errcode='22023',message='Cadastro inválido.';
 end if;
 -- Serializa dois pedidos da mesma identidade, inclusive antes de existir conta.
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_auth_user_id::text,0));
 select * into v_conta from public.contas_acesso where auth_user_id=p_auth_user_id for update;
 if found then
   if v_conta.papel <> 'organizacao' or v_conta.situacao <> 'ativa' or v_conta.organizacao_id is null then
     raise exception using errcode='42501',message='Vínculo indisponível.';
   end if;
   return v_conta.organizacao_id; -- retry não altera nome, papel ou situação
 end if;
 insert into public.organizacoes(nome_publico,canal_publico,estado_validacao)
 values(trim(p_nome_publico),nullif(trim(p_canal_publico),''),'pendente') returning id into v_organizacao;
 insert into public.contas_acesso(auth_user_id,organizacao_id,papel,situacao)
 values(p_auth_user_id,v_organizacao,'organizacao','ativa');
 return v_organizacao;
end;
$$;
revoke all on function public.criar_organizacao_pendente(uuid,text,text) from public,anon,authenticated;
grant execute on function public.criar_organizacao_pendente(uuid,text,text) to service_role;
commit;
