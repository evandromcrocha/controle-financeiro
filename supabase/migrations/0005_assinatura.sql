-- Marca de assinatura (serviço recorrente) nos lançamentos + backup antes da marcação inicial
create table if not exists financeiro.backup_lancamentos_20261102 as select * from financeiro.lancamentos;
alter table financeiro.backup_lancamentos_20261102 enable row level security;
alter table financeiro.lancamentos add column if not exists assinatura boolean not null default false;
