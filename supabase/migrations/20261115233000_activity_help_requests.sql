begin;

-- Preserve todas as necessidades de projeto existentes e habilita uma única
-- origem por necessidade: projeto institucional ou atividade própria.
alter table public.necessidades_projeto
  alter column projeto_id drop not null;

alter table public.necessidades_projeto
  add column atividade_id uuid references public.atividades(id) on delete restrict;

alter table public.necessidades_projeto
  add constraint necessidades_projeto_parent_check
  check (
    (projeto_id is not null and atividade_id is null)
    or (projeto_id is null and atividade_id is not null)
  );

create index necessidades_atividade_idx
  on public.necessidades_projeto(atividade_id, estado, atualizada_em desc)
  where atividade_id is not null;

commit;
