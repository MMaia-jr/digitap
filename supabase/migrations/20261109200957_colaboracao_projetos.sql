-- Collaboration grants project participation, never ownership of the person's private workspace.
create table public.vinculos_colaboracao (
 id uuid primary key default gen_random_uuid(),
 sujeito_id uuid not null references public.sujeitos_publicadores(id),
 projeto_id uuid not null references public.projetos(id),
 papel text not null check (papel in ('coordenador','colaborador','apoiador')),
 status text not null default 'pendente' check (status in ('pendente','ativo','recusado')),
 origem text not null check (origem in ('convite','proposta','candidatura')),
 criado_em timestamptz not null default now(),
 unique (sujeito_id,projeto_id)
);
create index colaboracao_projeto_status_idx on public.vinculos_colaboracao(projeto_id,status);
alter table public.vinculos_colaboracao enable row level security;
revoke all on public.vinculos_colaboracao from anon,authenticated;
grant all on public.vinculos_colaboracao to service_role;

alter table public.atividades add column criado_por_sujeito_id uuid references public.sujeitos_publicadores(id);
update public.atividades set criado_por_sujeito_id=sujeito_id;
alter table public.atividades alter column criado_por_sujeito_id set not null;
create index atividades_criador_sujeito_idx on public.atividades(criado_por_sujeito_id);
alter table public.atividades drop constraint atividades_projeto_sujeito_fk;
alter table public.atividades add column projeto_aprovacao text check (projeto_aprovacao in ('pendente','aprovada','rejeitada'));
alter table public.atividades add column projeto_versao_aprovada integer;
alter table public.atividades add column projeto_parecer text check (char_length(projeto_parecer)<=1500);

create function public.colaboracao_atividade_integridade() returns trigger
language plpgsql security invoker set search_path=pg_catalog as $$
declare dono uuid; alterou boolean;
begin
 if tg_op='INSERT' then
  new.criado_por_sujeito_id:=new.sujeito_id;
  alterou:=true;
 else
  if new.criado_por_sujeito_id is distinct from old.criado_por_sujeito_id then
   raise exception 'Autoria da atividade é imutável' using errcode='23514';
  end if;
  alterou:=new.projeto_id is distinct from old.projeto_id or new.versao_submetida<>old.versao_submetida
   or row(new.titulo,new.descricao,new.inicio_previsto,new.orientacao_acesso,new.referencia_oficial)
      is distinct from row(old.titulo,old.descricao,old.inicio_previsto,old.orientacao_acesso,old.referencia_oficial);
 end if;
 if new.projeto_id is null then
  new.projeto_aprovacao:=null;new.projeto_versao_aprovada:=null;new.projeto_parecer:=null;return new;
 end if;
 select sujeito_id into dono from public.projetos where id=new.projeto_id for key share;
 if dono=new.sujeito_id then
  new.projeto_aprovacao:=null;new.projeto_versao_aprovada:=null;new.projeto_parecer:=null;return new;
 end if;
 if alterou or (tg_op='UPDATE' and new.estado_editorial='enviada' and old.estado_editorial<>'enviada') then
  perform 1 from public.vinculos_colaboracao v join public.sujeitos_publicadores s on s.id=v.sujeito_id
   where v.sujeito_id=new.sujeito_id and v.projeto_id=new.projeto_id and v.status='ativo'
    and s.tipo='pessoa_fisica' and s.estado in ('pendente','ativo') for share of v,s;
  if not found then raise exception 'Colaboração ativa necessária para este projeto' using errcode='23514';end if;
 end if;
 if alterou then new.projeto_aprovacao:='pendente';new.projeto_versao_aprovada:=null;new.projeto_parecer:=null;end if;
 if new.estado_editorial in ('em_revisao','aprovada','publicada') and
    (tg_op='INSERT' or new.estado_editorial is distinct from old.estado_editorial or new.versao_publicada is distinct from old.versao_publicada) and
    (new.projeto_aprovacao is distinct from 'aprovada' or new.projeto_versao_aprovada is distinct from new.versao_submetida) then
  raise exception 'A versão exige aprovação da coordenação do projeto' using errcode='23514';
 end if;
 return new;
end $$;
-- Runs after the existing i4 trigger resolves legacy institutional subject IDs.
create trigger z_colaboracao_atividade_integridade before insert or update on public.atividades
 for each row execute function public.colaboracao_atividade_integridade();
revoke all on function public.colaboracao_atividade_integridade() from public,anon,authenticated;
