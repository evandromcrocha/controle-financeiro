// Regras de um lançamento (linha da tabela financeiro.lancamentos).
import * as C from './competencia.js?v=__BUILD__';

export const CREDITO = 'CRÉDITO', DEBITO = 'DÉBITO';
export const ehCredito = r => r.tipo === CREDITO;
export const valor = r => Math.abs(+r.valor);
export const assinado = r => (ehCredito(r) ? valor(r) : -valor(r));
export const pendente = r => !r.categoria;
export const parcelado = r => r.parcelas_total > 1;

/** Tipo de repetição: '' (nenhuma), 'recorrente' ou 'assinatura' (assinatura também repete todo mês). */
export const repeticao = r => (r.assinatura ? 'assinatura' : r.recorrente ? 'recorrente' : '');
export const comRepeticao = t => ({ recorrente: !!t, assinatura: t === 'assinatura' });

/** Lê um valor digitado ("1.234,56", "1234.56", "- 3.256,24", "R$ 10"); NaN se vazio. */
export const lerValor = v => {
  let s = String(v ?? '').trim().replace(/R\$/, '').replace(/\s+/g, '');
  if (!s) return NaN;
  s = /,\d{1,2}$/.test(s) ? s.replace(/\./g, '').replace(',', '.') : s.replace(/,/g, '');
  return parseFloat(s);
};

/** Vencimento no mês `comp` pelo dia de vencimento do cartão/conta; null se não houver dia cadastrado. */
export const vencimento = (forma, comp) => (forma?.dia_vencimento ? C.diaNoMes(comp, forma.dia_vencimento) : null);

/** Linha pronta para gravar: só colunas do banco, valor positivo e competencia_ref derivada da competência. */
export const registro = c => {
  const r = {
    descricao: c.descricao.trim().slice(0, 200), valor: Math.abs(+c.valor), tipo: c.tipo, categoria: c.categoria || null,
    forma_pagamento: c.forma_pagamento || null, competencia: c.competencia, competencia_ref: C.ref(c.competencia),
    data_transacao: C.dataValida(c.data_transacao) ? c.data_transacao : null,
    data_pagamento: C.dataValida(c.data_pagamento) ? c.data_pagamento : null,
    parcelas_total: +c.parcelas_total || 1, parcela_num: c.parcela_num ? +c.parcela_num : null,
    recorrente: !!c.recorrente, assinatura: !!c.assinatura,
  };
  for (const k of ['grupo', 'projetado', 'pagador']) if (k in c) r[k] = c[k];
  return r;
};

/**
 * Parcelas `de`..`total` de uma compra, uma por mês a partir da competência de `c` (parcela `de`).
 * O vencimento acompanha mês a mês; `existe(comp)` permite pular parcelas já lançadas.
 */
export const parcelas = (c, { de = 1, total, existe = () => false }) => {
  const grupo = 'PARC:' + crypto.randomUUID(), linhas = [];
  for (let n = de, k = 0; n <= total; n++, k++) {
    const comp = C.desloca(c.competencia, k);
    if (k > 0 && existe(comp)) continue;
    linhas.push(registro({ ...c, competencia: comp, data_pagamento: C.somaMeses(c.data_pagamento, k), parcela_num: n, parcelas_total: total, grupo, projetado: false }));
  }
  return linhas;
};
