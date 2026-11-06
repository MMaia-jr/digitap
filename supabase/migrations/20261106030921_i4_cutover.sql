-- I4 CUTOVER: organizações continuam v1; PF/coletivos usam v2.
-- Aplicar somente após reconciliação, release inclusivo e testes RED.
begin;

-- CUTOVER STEP ROLE
alter table public.contas_acesso
  drop constraint contas_acesso_papel_check,
  add constraint contas_acesso_papel_check
    check (papel in ('organizacao','editor','administrador','publicador'));

-- CUTOVER STEP ACCOUNT
alter table public.contas_acesso
  drop constraint papel_vinculo,
  add constraint papel_vinculo check (
    (papel <> 'organizacao' or organizacao_id is not null)
    and (papel <> 'publicador' or organizacao_id is null)
  );

-- CUTOVER STEP NULLABLE
alter table public.atividades alter column organizacao_id drop not null;

-- CUTOVER STEP FUNCTION
create or replace function public.i4_atividade_sujeito() returns trigger
language plpgsql security invoker set search_path = pg_catalog
as $$
declare s public.sujeitos_publicadores%rowtype;
begin
  if tg_op = 'UPDATE' and old.sujeito_id is not null
    and new.sujeito_id is distinct from old.sujeito_id then
    raise exception 'Titular da atividade é imutável' using errcode = '23514';
  end if;
  -- Escritor organizacional legado só resolve um mapeamento já comprovado.
  -- Não cria organização/sujeito, não fabrica vínculo, não escolhe outro tenant.
  if new.sujeito_id is null and new.organizacao_id is not null then
    select id into new.sujeito_id from public.sujeitos_publicadores
      where tipo = 'organizacao' and organizacao_legada_id = new.organizacao_id;
  end if;
  select * into s from public.sujeitos_publicadores where id = new.sujeito_id for key share;
  if not found then
    raise exception 'Atividade exige sujeito existente e reconciliado' using errcode = '23514';
  end if;
  if s.tipo = 'organizacao' then
    if new.organizacao_id is null or new.organizacao_id <> s.organizacao_legada_id then
      raise exception 'Organização exige ambas as referências coerentes' using errcode = '23514';
    end if;
    if new.politica_publicacao is null then new.politica_publicacao := 'i3'; end if;
    if new.politica_publicacao <> 'i3' then
      raise exception 'Organização conserva política i3 neste CUTOVER' using errcode = '23514';
    end if;
  else
    if new.organizacao_id is not null then
      raise exception 'PF/coletivo não admite organizacao_id' using errcode = '23514';
    end if;
    if new.politica_publicacao is null then new.politica_publicacao := 'i4'; end if;
    if new.politica_publicacao <> 'i4' then
      raise exception 'PF/coletivo exige política i4' using errcode = '23514';
    end if;
  end if;
  return new;
end
$$;

-- CUTOVER STEP TRIGGER
drop trigger i4_atividade_sujeito on public.atividades;
create trigger i4_atividade_sujeito
  before insert or update of sujeito_id, organizacao_id, politica_publicacao
  on public.atividades for each row execute function public.i4_atividade_sujeito();

-- CUTOVER STEP REQUIRED
alter table public.atividades
  alter column sujeito_id set not null,
  alter column politica_publicacao set not null;

commit;
