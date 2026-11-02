-- Marca de assinatura (serviço recorrente) nos lançamentos + backup antes da marcação inicial
create table if not exists financeiro.backup_lancamentos_20261102 as select * from financeiro.lancamentos;
alter table financeiro.backup_lancamentos_20261102 enable row level security;
alter table financeiro.lancamentos add column if not exists assinatura boolean not null default false;

-- projeções herdam a marca de assinatura do último lançamento real
create or replace function financeiro.projetar_recorrentes(ate text)
returns integer language plpgsql security definer set search_path to 'financeiro','public' as $function$
declare uid uuid := auth.uid(); fim date; n integer := 0;
begin
  if uid is null then raise exception 'não autenticado'; end if;
  if ate !~ '^\d{2}/\d{4}$' then raise exception 'informe a competência final como MM/AAAA'; end if;
  fim := to_date(split_part(ate,'/',2)||'-'||split_part(ate,'/',1)||'-01','YYYY-MM-DD');
  with base as (
    select distinct on (descricao, forma_pagamento)
      descricao, forma_pagamento, categoria, pagador, tipo, valor, valor_final,
      data_transacao, data_pagamento, competencia_ref, parcelas_total, assinatura
    from financeiro.lancamentos
    where user_id = uid and recorrente and not projetado
    order by descricao, forma_pagamento, competencia_ref desc
  ), meses as (
    select b.*, gs::date as novo_ref from base b
    cross join lateral generate_series((b.competencia_ref + interval '1 month')::date, fim, interval '1 month') gs
  ), novos as (
    select m.* from meses m where not exists (
      select 1 from financeiro.lancamentos l
      where l.user_id = uid and l.descricao = m.descricao
        and l.forma_pagamento is not distinct from m.forma_pagamento and l.competencia_ref = m.novo_ref)
  )
  insert into financeiro.lancamentos
    (user_id, descricao, forma_pagamento, categoria, pagador, tipo, valor, valor_final,
     data_pagamento, competencia, competencia_ref, recorrente, projetado, grupo, assinatura)
  select uid, descricao, forma_pagamento, categoria, pagador, tipo, valor, valor_final,
     (novo_ref + (extract(day from data_pagamento)::int - 1)), to_char(novo_ref,'MM/YYYY'), novo_ref, true, true,
     'REC:'||descricao||'|'||coalesce(forma_pagamento,''), assinatura
  from novos;
  get diagnostics n = row_count;
  return n;
end $function$;
