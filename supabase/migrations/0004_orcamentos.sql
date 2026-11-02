-- Metas de orçamento mensal por categoria (valor máximo de gasto por mês)
create table if not exists financeiro.orcamentos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  categoria text not null,
  valor numeric(12,2) not null check (valor > 0),
  created_at timestamptz not null default now(),
  unique (user_id, categoria)
);
alter table financeiro.orcamentos enable row level security;
create policy own_all on financeiro.orcamentos for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
grant select, insert, update, delete on financeiro.orcamentos to authenticated;
