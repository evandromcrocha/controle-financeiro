-- Classifica automaticamente lançamentos pendentes (sem categoria) do usuário
-- logado, copiando a categoria mais usada no histórico para descrições iguais
-- (normalizadas: minúsculas, sem acento, sem "Parcela x/y", só letras/números).
create extension if not exists unaccent;

create or replace function financeiro.autocategorizar()
returns integer
language plpgsql
security definer
set search_path = financeiro, public
as $$
declare
  uid uuid := auth.uid();
  n integer;
begin
  if uid is null then raise exception 'não autenticado'; end if;

  with base as (
    select id, categoria,
      btrim(regexp_replace(
        regexp_replace(lower(unaccent(descricao)), '\s*-?\s*parcela\s+\d+\s*(/|de)\s*\d+', '', 'g'),
        '[^a-z0-9]+', ' ', 'g')) as chave
    from financeiro.lancamentos
    where user_id = uid
  ),
  hist as (
    select chave, categoria,
           row_number() over (partition by chave order by count(*) desc) rn
    from base
    where categoria is not null and chave <> ''
    group by chave, categoria
  )
  update financeiro.lancamentos l
  set categoria = h.categoria
  from base b
  join hist h on h.chave = b.chave and h.rn = 1
  where l.id = b.id and l.categoria is null;

  get diagnostics n = row_count;
  return n;
end $$;

grant execute on function financeiro.autocategorizar() to authenticated;
