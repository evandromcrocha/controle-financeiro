-- As regras de recorrência, projeção, parcelas e auto-categorização passaram para o app (web/js/dominio).
-- Aplicar depois que a versão nova do app estiver publicada (a anterior ainda chama estas funções).

-- valor_final deixa de ser gravado pelo app: passa a ser derivado de tipo + valor.
alter table financeiro.lancamentos drop column valor_final;
alter table financeiro.lancamentos add column valor_final numeric
  generated always as (case when tipo = 'CRÉDITO' then abs(valor) else -abs(valor) end) stored;

-- recorrências são identificadas por descrição + cartão/conta; o grupo 'REC:...' não é mais usado.
update financeiro.lancamentos set grupo = null where grupo like 'REC:%';

drop function if exists financeiro.ajustar_projecoes cascade;
drop function if exists financeiro.autocategorizar cascade;
drop function if exists financeiro.excluir_parcelas_seguintes cascade;
drop function if exists financeiro.excluir_projecoes cascade;
drop function if exists financeiro.projetar_recorrentes cascade;
drop function if exists financeiro.resumo_projecoes cascade;
