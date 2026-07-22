-- Controle Financeiro: cartões/contas, categorias e lançamentos
create extension if not exists "pgcrypto";

create table if not exists public.fin_formas_pagamento (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  nome text not null,
  tipo text not null default 'CARTAO' check (tipo in ('CARTAO','CONTA','DINHEIRO')),
  dia_vencimento int,
  cor text default '#6366f1',
  created_at timestamptz not null default now(),
  unique (user_id, nome)
);

create table if not exists public.fin_categorias (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  nome text not null,
  cor text default '#64748b',
  created_at timestamptz not null default now(),
  unique (user_id, nome)
);

create table if not exists public.fin_lancamentos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  descricao text not null,
  data_transacao date,
  parcela_atual int default 1,
  parcelas_total int default 1,
  forma_pagamento text,
  categoria text,
  pagador text,
  tipo text not null default 'DÉBITO' check (tipo in ('CRÉDITO','DÉBITO')),
  valor numeric(14,2) not null default 0,
  valor_final numeric(14,2) not null default 0,
  data_pagamento date,
  competencia text,            -- formato MM/YYYY
  competencia_ref date,        -- primeiro dia do mês (para ordenar/filtrar)
  recorrente boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_fin_lanc_user on public.fin_lancamentos(user_id);
create index if not exists idx_fin_lanc_comp on public.fin_lancamentos(user_id, competencia_ref);
create index if not exists idx_fin_lanc_cat on public.fin_lancamentos(user_id, categoria);

alter table public.fin_formas_pagamento enable row level security;
alter table public.fin_categorias enable row level security;
alter table public.fin_lancamentos enable row level security;

do $$
declare t text;
begin
  foreach t in array array['fin_formas_pagamento','fin_categorias','fin_lancamentos']
  loop
    execute format('drop policy if exists "own_select" on public.%I', t);
    execute format('drop policy if exists "own_insert" on public.%I', t);
    execute format('drop policy if exists "own_update" on public.%I', t);
    execute format('drop policy if exists "own_delete" on public.%I', t);
    execute format('create policy "own_select" on public.%I for select using (auth.uid() = user_id)', t);
    execute format('create policy "own_insert" on public.%I for insert with check (auth.uid() = user_id)', t);
    execute format('create policy "own_update" on public.%I for update using (auth.uid() = user_id) with check (auth.uid() = user_id)', t);
    execute format('create policy "own_delete" on public.%I for delete using (auth.uid() = user_id)', t);
  end loop;
end $$;
