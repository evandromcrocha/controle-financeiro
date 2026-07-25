import { supabase } from './supabase';
import { compToRef } from './format';
import type { Lancamento, FormaPagamento, Categoria } from './types';
import seed from './seed.json';

export async function listLancamentos(competencia?: string): Promise<Lancamento[]> {
  let q = supabase.from('lancamentos').select('*');
  if (competencia) q = q.eq('competencia', competencia);
  const { data, error } = await q
    .order('competencia_ref', { ascending: false })
    .order('data_pagamento', { ascending: true, nullsFirst: false });
  if (error) throw error;
  return (data ?? []) as Lancamento[];
}

export async function listAllLancamentos(): Promise<Lancamento[]> {
  // busca em páginas de 1000 (limite padrão do Supabase por consulta)
  const PAGE = 1000;
  let from = 0;
  const all: Lancamento[] = [];
  for (;;) {
    const { data, error } = await supabase
      .from('lancamentos')
      .select('*')
      .order('competencia_ref', { ascending: false })
      .range(from, from + PAGE - 1);
    if (error) throw error;
    all.push(...((data ?? []) as Lancamento[]));
    if (!data || data.length < PAGE) break;
    from += PAGE;
  }
  return all;
}

export async function listCompetencias(): Promise<string[]> {
  const { data, error } = await supabase
    .from('lancamentos')
    .select('competencia, competencia_ref')
    .not('competencia', 'is', null)
    .order('competencia_ref', { ascending: false });
  if (error) throw error;
  const seen = new Set<string>();
  const out: string[] = [];
  for (const r of data ?? []) {
    const c = (r as any).competencia as string;
    if (c && !seen.has(c)) { seen.add(c); out.push(c); }
  }
  return out;
}

export async function upsertLancamento(l: Partial<Lancamento>): Promise<void> {
  const payload: any = { ...l };
  if (payload.competencia) payload.competencia_ref = compToRef(payload.competencia);
  // valor_final: crédito positivo, débito negativo
  const v = Math.abs(Number(payload.valor) || 0);
  payload.valor = v;
  payload.valor_final = payload.tipo === 'CRÉDITO' ? v : -v;
  if (payload.id) {
    const { error } = await supabase.from('lancamentos').update(payload).eq('id', payload.id);
    if (error) throw error;
  } else {
    delete payload.id;
    const { error } = await supabase.from('lancamentos').insert(payload);
    if (error) throw error;
  }
}

export async function deleteLancamento(id: string): Promise<void> {
  const { error } = await supabase.from('lancamentos').delete().eq('id', id);
  if (error) throw error;
}

export async function listFormas(): Promise<FormaPagamento[]> {
  const { data, error } = await supabase
    .from('formas_pagamento')
    .select('*')
    .order('nome');
  if (error) throw error;
  return (data ?? []) as FormaPagamento[];
}

export async function upsertForma(f: Partial<FormaPagamento>): Promise<void> {
  if (f.id) {
    const { error } = await supabase.from('formas_pagamento').update(f).eq('id', f.id);
    if (error) throw error;
  } else {
    const { error } = await supabase.from('formas_pagamento').insert(f);
    if (error) throw error;
  }
}

export async function deleteForma(id: string): Promise<void> {
  const { error } = await supabase.from('formas_pagamento').delete().eq('id', id);
  if (error) throw error;
}

export async function listCategorias(): Promise<Categoria[]> {
  const { data, error } = await supabase.from('categorias').select('*').order('nome');
  if (error) throw error;
  return (data ?? []) as Categoria[];
}

export async function upsertCategoria(nome: string): Promise<void> {
  const { error } = await supabase
    .from('categorias')
    .upsert({ nome: nome.trim().toUpperCase() }, { onConflict: 'user_id,nome' });
  if (error) throw error;
}

// ---- Importação inicial (seed a partir da planilha) ----
export async function countLancamentos(): Promise<number> {
  const { count, error } = await supabase
    .from('lancamentos')
    .select('*', { count: 'exact', head: true });
  if (error) throw error;
  return count ?? 0;
}

export async function importarSeed(
  onProgress?: (done: number, total: number) => void
): Promise<{ lancamentos: number }> {
  const { data: userData } = await supabase.auth.getUser();
  const user_id = userData.user?.id;
  if (!user_id) throw new Error('Usuário não autenticado');

  // formas de pagamento
  const formas = (seed.formas_pagamento as any[]).map((f) => ({
    user_id,
    nome: f.nome,
    tipo: f.tipo,
    dia_vencimento: f.dia_vencimento,
  }));
  await supabase.from('formas_pagamento').upsert(formas, { onConflict: 'user_id,nome' });

  // categorias
  const cats = (seed.categorias as string[]).map((c) => ({ user_id, nome: c }));
  await supabase.from('categorias').upsert(cats, { onConflict: 'user_id,nome' });

  // lançamentos em lotes
  const rows = (seed.lancamentos as any[]).map((l) => ({
    user_id,
    descricao: l.descricao,
    data_transacao: l.data_transacao,
    parcelas_total: l.parcelas_total,
    forma_pagamento: l.forma_pagamento,
    categoria: l.categoria ? String(l.categoria).toUpperCase() : null,
    pagador: l.pagador,
    tipo: l.tipo,
    valor: Math.abs(Number(l.valor) || 0),
    valor_final: Number(l.valor_final) || 0,
    data_pagamento: l.data_pagamento,
    competencia: l.competencia,
    competencia_ref: l.competencia_ref,
    recorrente: !!l.recorrente,
  }));

  const CHUNK = 500;
  for (let i = 0; i < rows.length; i += CHUNK) {
    const batch = rows.slice(i, i + CHUNK);
    const { error } = await supabase.from('lancamentos').insert(batch);
    if (error) throw error;
    onProgress?.(Math.min(i + CHUNK, rows.length), rows.length);
  }
  return { lancamentos: rows.length };
}
