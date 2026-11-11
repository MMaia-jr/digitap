-- Apoio simbólico e intenção, sem presença comprovada ou reputação.
-- RPCs de escrita/contadores são invoker e exclusivas do backend service_role.
-- O único definer é um predicado privado de propriedade para RLS (retorna boolean).
begin;
create schema participacao_privada;
revoke all on schema participacao_privada from public,anon,authenticated;
grant usage on schema participacao_privada to authenticated,service_role;

create table public.confirmacoes (
 id uuid primary key default gen_random_uuid(),
 atividade_id uuid not null references public.atividades(id) on delete restrict,
 sujeito_id uuid not null references public.sujeitos_publicadores(id) on delete restrict,
 criada_por_conta_id uuid not null references public.contas_acesso(id) on delete restrict,
 tipo text not null check (tipo in ('apoio','intencao')),
 whatsapp text check (whatsapp is null or whatsapp ~ '^\+?[0-9]{10,15}$'),
 acompanhantes integer not null default 1 check (acompanhantes between 1 and 20),
 mostrar_nome boolean not null default false,
 criado_em timestamptz not null default now(),
 constraint confirmacoes_atividade_sujeito_unique unique (atividade_id,sujeito_id),
 constraint confirmacoes_apoio_simbolico check (tipo='intencao' or (whatsapp is null and acompanhantes=1 and not mostrar_nome))
);
comment on column public.confirmacoes.acompanhantes is 'Quantidade de pessoas pretendidas no grupo, incluindo quem registra; não comprova presença.';
comment on column public.confirmacoes.mostrar_nome is 'Consentimento opcional explícito para divulgar somente nome público de intenção. Padrão privado.';
create index confirmacoes_sujeito_idx on public.confirmacoes(sujeito_id,atividade_id);
create index confirmacoes_autor_idx on public.confirmacoes(criada_por_conta_id);
alter table public.confirmacoes enable row level security;
revoke all on public.confirmacoes from public,anon,authenticated;
grant select on public.confirmacoes to authenticated;
grant select,insert,update,delete on public.confirmacoes to service_role;

create function participacao_privada.sujeito_da_conta(p_auth_user_id uuid)
returns uuid language sql stable security invoker set search_path=''
as $$
 select s.id from public.contas_acesso c
 join public.vinculos_publicadores v on v.conta_id=c.id and v.atual and v.situacao='ativo' and v.papel_vinculo='titular' and 'ler_privado'=any(v.escopos)
 join public.sujeitos_publicadores s on s.id=v.sujeito_id
 where c.auth_user_id=p_auth_user_id and c.situacao='ativa' and s.estado in ('pendente','ativo')
 and ((s.tipo='pessoa_fisica' and exists(select 1 from public.pessoas_fisicas p where p.sujeito_id=s.id and p.conta_id=c.id))
   or (s.tipo='organizacao' and c.papel='organizacao' and c.organizacao_id=s.organizacao_legada_id))
 order by case when s.tipo='pessoa_fisica' then 0 else 1 end,s.id limit 1;
$$;
create function participacao_privada.confirmacao_propria(p_sujeito_id uuid,p_conta_id uuid)
returns boolean language sql stable security definer set search_path=''
as $$
 select auth.uid() is not null
 and exists(select 1 from auth.users u where u.id=(select auth.uid()) and u.email_confirmed_at is not null)
 and exists(select 1 from public.contas_acesso c where c.id=p_conta_id and c.auth_user_id=(select auth.uid()) and c.situacao='ativa')
 and p_sujeito_id=participacao_privada.sujeito_da_conta((select auth.uid()));
$$;
create policy confirmacoes_proprias on public.confirmacoes for select to authenticated
 using ((select auth.uid()) is not null and participacao_privada.confirmacao_propria(sujeito_id,criada_por_conta_id));
-- Sem policies/grants de INSERT/UPDATE/DELETE para clientes: identidade e
-- elegibilidade são verificadas no backend e nas RPCs abaixo, sem payload de sujeito.

create function participacao_privada.atividade_visivel(p_atividade_id uuid)
returns boolean language plpgsql stable security invoker set search_path=''
as $$
declare a public.atividades%rowtype; e record; m jsonb; n integer:=0;
begin
 select * into a from public.atividades where id=p_atividade_id;
 if not found or a.estado_editorial='retirada' or a.versao_publicada is null
 or a.numero_versao_publicada is null or a.versao_publicada->>'id' is distinct from a.id::text
 or a.versao_publicada->>'versao' is distinct from a.numero_versao_publicada::text then return false; end if;
 if not exists(select 1 from public.sujeitos_publicadores s left join public.organizacoes o on o.id=a.organizacao_id
   where s.id=a.sujeito_id and (
    (s.tipo='organizacao' and o.estado_validacao='validada' and s.organizacao_legada_id=o.id
      and a.versao_publicada->'organizacao'->>'id'=o.id::text)
    or (a.organizacao_id is null and s.tipo in ('pessoa_fisica','coletivo_informal') and s.estado='ativo'
      and s.risco<>'alto' and a.politica_publicacao='i4' and a.versao_publicada->'sujeito'->>'id'=s.id::text))) then return false; end if;
 for e in select justificativa_restrita from public.eventos_editoriais
  where objeto_tipo='atividade' and objeto_id=a.id and acao='atividade_publicada'
    and estado_anterior='aprovada' and estado_novo='publicada' and executada_por_conta_id is not null loop
  begin m:=e.justificativa_restrita::jsonb; exception when invalid_text_representation then continue; end;
  if m->>'tipo'='publicacao.v1' and m->>'versao_esperada'=a.numero_versao_publicada::text
   and exists(select 1 from public.autorizacoes_publicacao au where au.id::text=m->>'autorizacao_id'
     and au.objeto_tipo='atividade' and au.objeto_id=a.id and au.situacao='vigente' and au.revogada_em is null
     and au.autorizada_em<=now() and (au.validade_ate is null or au.validade_ate>now())
     and 'divulgacao'=any(au.escopo_autorizado)
     and ('atividade:versao:'||a.numero_versao_publicada)=any(au.escopo_autorizado)
     and char_length(trim(au.papel_autorizante))>0 and char_length(trim(au.comprovante_restrito))>0)
   then n:=n+1; end if;
 end loop;
 return n=1;
end;
$$;

create function public.registrar_confirmacao(p_auth_user_id uuid,p_atividade_id uuid,p_tipo text,
 p_whatsapp text default null,p_acompanhantes integer default 1,p_mostrar_nome boolean default false)
returns jsonb language plpgsql security invoker set search_path=''
as $$
declare s uuid; autor uuid; a public.atividades%rowtype;
begin
 s:=participacao_privada.sujeito_da_conta(p_auth_user_id);
 if s is null then raise exception using errcode='42501',message='Conta indisponível.'; end if;
 select id into strict autor from public.contas_acesso where auth_user_id=p_auth_user_id and situacao='ativa';
 -- Serialize against withdrawal/cancellation/editing; UNIQUE handles concurrent repeats.
 select * into a from public.atividades where id=p_atividade_id for share;
 if not found or not participacao_privada.atividade_visivel(p_atividade_id)
 then raise exception using errcode='P0002',message='Atividade indisponível.'; end if;
 if a.estado_programacao not in ('programada','adiada') or (a.versao_publicada->>'inicio_previsto')::timestamptz<=now()
 then raise exception using errcode='55000',message='Participação encerrada.'; end if;
 insert into public.confirmacoes(atividade_id,sujeito_id,criada_por_conta_id,tipo,whatsapp,acompanhantes,mostrar_nome)
 values(p_atividade_id,s,autor,p_tipo,p_whatsapp,p_acompanhantes,p_mostrar_nome);
 return jsonb_build_object('tipo',p_tipo,'acompanhantes',p_acompanhantes,'mostrar_nome',p_mostrar_nome);
end;
$$;
create function public.resumo_publico_confirmacoes(p_atividade_id uuid)
returns jsonb language plpgsql stable security invoker set search_path=''
as $$
declare result jsonb; aberta boolean; nomes jsonb;
begin
 if not participacao_privada.atividade_visivel(p_atividade_id)
 then raise exception using errcode='P0002',message='Atividade indisponível.'; end if;
 select a.estado_programacao in ('programada','adiada') and (a.versao_publicada->>'inicio_previsto')::timestamptz>now()
 into aberta from public.atividades a where a.id=p_atividade_id;
 select jsonb_build_object('apoios',count(*) filter(where tipo='apoio'),'intencoes',count(*) filter(where tipo='intencao'))
 into result from public.confirmacoes where atividade_id=p_atividade_id;
 select coalesce(jsonb_agg(n.nome_publico order by n.criado_em,n.id),'[]'::jsonb) into nomes
 from (select s.nome_publico,c.criado_em,c.id from public.confirmacoes c
 join public.sujeitos_publicadores s on s.id=c.sujeito_id and s.estado in ('pendente','ativo')
 where c.atividade_id=p_atividade_id and c.tipo='intencao' and c.mostrar_nome
 order by c.criado_em,c.id limit 100) n;
 -- No IDs, WhatsApp, group size or individual attendance in public output.
 return result||jsonb_build_object('nomes_publicos',nomes,'aberta',aberta);
end;
$$;
create function public.contadores_confirmacoes_organizador(p_auth_user_id uuid,p_atividade_id uuid)
returns jsonb language plpgsql stable security invoker set search_path=''
as $$
declare result jsonb;
begin
 if not exists(select 1 from public.atividades a
 join public.contas_acesso c on c.auth_user_id=p_auth_user_id and c.situacao='ativa'
 join public.vinculos_publicadores v on v.conta_id=c.id and v.sujeito_id=a.sujeito_id
   and v.atual and v.situacao='ativo' and v.papel_vinculo='titular' and 'ler_privado'=any(v.escopos)
 join public.sujeitos_publicadores s on s.id=a.sujeito_id and s.estado in ('pendente','ativo')
 where a.id=p_atividade_id)
 then raise exception using errcode='42501',message='Acesso negado.'; end if;
 select jsonb_build_object('apoios',count(*) filter(where tipo='apoio'),'intencoes',count(*) filter(where tipo='intencao'))
 into result from public.confirmacoes where atividade_id=p_atividade_id;
 return result;
end;
$$;
revoke all on all functions in schema participacao_privada from public,anon,authenticated;
grant execute on all functions in schema participacao_privada to service_role;
grant execute on function participacao_privada.confirmacao_propria(uuid,uuid) to authenticated;
revoke all on function public.registrar_confirmacao(uuid,uuid,text,text,integer,boolean),
 public.resumo_publico_confirmacoes(uuid),public.contadores_confirmacoes_organizador(uuid,uuid) from public,anon,authenticated;
grant execute on function public.registrar_confirmacao(uuid,uuid,text,text,integer,boolean),
 public.resumo_publico_confirmacoes(uuid),public.contadores_confirmacoes_organizador(uuid,uuid) to service_role;
notify pgrst,'reload schema';
commit;
