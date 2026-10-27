-- Apaga um lançamento parcelado e todas as parcelas seguintes do mesmo grupo
create or replace function financeiro.excluir_parcelas_seguintes(p_id uuid)
returns integer
language plpgsql security definer set search_path = financeiro, public
as $$
declare uid uuid := auth.uid(); g text; ref date; n integer;
begin
  if uid is null then raise exception 'não autenticado'; end if;
  select grupo, competencia_ref into g, ref
  from financeiro.lancamentos where id = p_id and user_id = uid;
  if not found then raise exception 'lançamento não encontrado'; end if;
  if g is null then
    delete from financeiro.lancamentos where id = p_id and user_id = uid;
  else
    delete from financeiro.lancamentos
    where user_id = uid and grupo = g and competencia_ref >= ref;
  end if;
  get diagnostics n = row_count;
  return n;
end $$;
grant execute on function financeiro.excluir_parcelas_seguintes(uuid) to authenticated;
