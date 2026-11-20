create table public.evidencias_arquivos_privados (
  id uuid primary key default gen_random_uuid(),
  registro_id uuid not null references public.registros_realizacao(id) on delete restrict,
  object_key text not null unique check (btrim(object_key) <> ''),
  content_type text not null check (btrim(content_type) <> ''),
  size_bytes integer not null check (size_bytes > 0),
  estado text not null default 'pendente' check (estado in ('pendente', 'confirmado'))
);

create index evidencias_arquivos_privados_registro_idx
  on public.evidencias_arquivos_privados (registro_id);

alter table public.evidencias_arquivos_privados enable row level security;
revoke all on table public.evidencias_arquivos_privados from public, anon, authenticated;
grant select, insert, update, delete on table public.evidencias_arquivos_privados to service_role;
