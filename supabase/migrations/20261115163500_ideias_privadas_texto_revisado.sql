alter table public.ideias_privadas
  add column revised_text text check (revised_text is null or length(btrim(revised_text)) between 1 and 20000);

comment on column public.ideias_privadas.revised_text is
  'Texto editado pela pessoa; original_text permanece como fonte imutável da interpretação original.';
