-- Controle Financeiro: schema dedicado "financeiro" (fora do public)
create schema if not exists financeiro;

create table if not exists financeiro.formas_pagamento (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  nome text not null,
  tipo text not null default 'CARTAO' check (tipo in ('CARTAO','CONTA','DINHEIRO')),
  dia_vencimento int,
  cor text default '#6366f1',
  created_at timestamptz not null default now(),
  unique (user_id, nome)
);

create table if not exists financeiro.categorias (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  nome text not null,
  cor text default '#64748b',
  created_at timestamptz not null default now(),
  unique (user_id, nome)
);

create table if not exists financeiro.lancamentos (
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
  competencia_ref date,        -- primeiro dia do mês
  recorrente boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_lanc_user on financeiro.lancamentos(user_id);
create index if not exists idx_lanc_comp on financeiro.lancamentos(user_id, competencia_ref);
create index if not exists idx_lanc_cat on financeiro.lancamentos(user_id, categoria);

-- RLS: cada usuário só acessa os próprios registros
alter table financeiro.formas_pagamento enable row level security;
alter table financeiro.categorias enable row level security;
alter table financeiro.lancamentos enable row level security;

do $$
declare t text;
begin
  foreach t in array array['formas_pagamento','categorias','lancamentos']
  loop
    execute format('drop policy if exists "own_all" on financeiro.%I', t);
    execute format('create policy "own_all" on financeiro.%I for all using (auth.uid() = user_id) with check (auth.uid() = user_id)', t);
  end loop;
end $$;

-- Permissões para os papéis da API
grant usage on schema financeiro to anon, authenticated, service_role;
grant all on all tables in schema financeiro to anon, authenticated, service_role;
grant all on all sequences in schema financeiro to anon, authenticated, service_role;
alter default privileges in schema financeiro grant all on tables to anon, authenticated, service_role;
alter default privileges in schema financeiro grant all on sequences to anon, authenticated, service_role;

-- Expõe o schema na API PostgREST (também pode ser feito no painel:
-- Settings > API > Exposed schemas)
alter role authenticator set pgrst.db_schemas = 'public, graphql_public, financeiro';
notify pgrst, 'reload config';
notify pgrst, 'reload schema';
