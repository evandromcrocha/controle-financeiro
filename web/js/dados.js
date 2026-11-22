// Acesso ao Supabase (schema "financeiro"). Toda leitura e gravação do app passa por aqui.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const sb = createClient('https://fjlphewbocclfwzwlymy.supabase.co', 'sb_publishable_Sbs85eyq_D4oKbJ4-LDE6g_aWV-KE3S', { db: { schema: 'financeiro' } });
const T = () => sb.from('lancamentos');
const ok = ({ data, error }) => { if (error) throw new Error(error.message); return data; };
const LOTE = 100; // ids por requisição (limite de tamanho da URL)
const emLotes = async (ids, fn) => { for (let i = 0; i < ids.length; i += LOTE) ok(await fn(ids.slice(i, i + LOTE))); };

// ---------- leitura ----------
const todosLancamentos = async () => {
  const P = 1000, todos = []; // o Supabase devolve no máximo 1000 linhas por consulta
  for (let de = 0; ; de += P) {
    const lote = ok(await T().select('*').order('competencia_ref', { ascending: false }).range(de, de + P - 1)) || [];
    todos.push(...lote);
    if (lote.length < P) return todos;
  }
};
export const carregar = async () => {
  const [rows, cats, formas, orc, u] = await Promise.all([todosLancamentos(),
    sb.from('categorias').select('id,nome').order('nome').then(ok), sb.from('formas_pagamento').select('id,nome,tipo,dia_vencimento').order('nome').then(ok),
    sb.from('orcamentos').select('id,categoria,valor').then(ok), sb.auth.getUser()]);
  return { rows, cats: cats || [], formas: formas || [], orc: orc || [], saldoIni: +(u.data?.user?.user_metadata?.saldo_inicial || 0) };
};

// ---------- lançamentos ----------
export const inserir = async linhas => { if (linhas.length) ok(await T().insert(linhas)); };
export const atualizar = async (id, campos) => ok(await T().update(campos).eq('id', id));
/** Atualiza vários lançamentos, cada um com seus campos: [{id, campos}]. */
export const atualizarCada = async lista => { for (let i = 0; i < lista.length; i += 20) await Promise.all(lista.slice(i, i + 20).map(x => atualizar(x.id, x.campos))); };
export const atualizarTodos = (ids, campos) => emLotes(ids, l => T().update(campos).in('id', l));
export const excluir = ids => emLotes(ids, l => T().delete().in('id', l));

// ---------- cadastros ----------
const cadastro = tabela => ({
  salvar: async (id, campos) => ok(await (id ? sb.from(tabela).update(campos).eq('id', id) : sb.from(tabela).insert(campos))),
  excluir: async id => ok(await sb.from(tabela).delete().eq('id', id)),
});
export const categorias = cadastro('categorias');
export const formas = cadastro('formas_pagamento');
export const metas = { ...cadastro('orcamentos'), salvar: async (categoria, valor) => ok(await sb.from('orcamentos').upsert({ categoria, valor }, { onConflict: 'user_id,categoria' })) };

// ---------- conta ----------
export const aoMudarSessao = fn => sb.auth.onAuthStateChange((_e, s) => fn(s));
export const entrar = async (email, password) => ok(await sb.auth.signInWithPassword({ email, password }));
export const sair = () => sb.auth.signOut();
export const salvarSaldoInicial = async v => ok(await sb.auth.updateUser({ data: { saldo_inicial: v } }));
export const trocarSenha = async (atual, nova) => {
  const { data: { user } } = await sb.auth.getUser();
  const { error } = await sb.auth.signInWithPassword({ email: user.email, password: atual });
  if (error) throw new Error('Senha atual incorreta.');
  ok(await sb.auth.updateUser({ password: nova }));
};

// ---------- Edge Functions ----------
/** Chama uma Edge Function; em erro, lança a mensagem devolvida pelo servidor ({ erro }). */
export const invocar = async (nome, body) => {
  const { data, error } = await sb.functions.invoke(nome, { body });
  if (error) { let msg = error.message; try { msg = (await error.context.json())?.erro || msg; } catch {} throw new Error(msg); }
  if (!data?.ok) throw new Error(data?.erro || 'Falha no servidor.');
  return data;
};
