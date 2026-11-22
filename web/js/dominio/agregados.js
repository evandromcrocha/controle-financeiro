// Totais calculados a partir dos lançamentos carregados.
import * as C from './competencia.js?v=__BUILD__';
import { DEBITO, ehCredito, valor, parcelado } from './lancamento.js?v=__BUILD__';
import { normalizar, semParcela } from './texto.js?v=__BUILD__';
import { chave } from './recorrencia.js?v=__BUILD__';

export const entradasSaidas = rows => {
  let e = 0, s = 0;
  rows.forEach(r => (ehCredito(r) ? (e += valor(r)) : (s += valor(r))));
  return { e, s };
};

/** Entradas e saídas de cada competência. */
export const porMes = rows => {
  const m = new Map();
  rows.forEach(r => { if (!r.competencia) return; const t = m.get(r.competencia) || { e: 0, s: 0 }; ehCredito(r) ? (t.e += valor(r)) : (t.s += valor(r)); m.set(r.competencia, t); });
  return m;
};
export const totaisDoMes = (meses, c) => meses.get(c) || { e: 0, s: 0 };

/** Saldo no fim de cada competência: saldo inicial + entradas − saídas acumuladas, em ordem. */
export const saldosFinais = (meses, saldoInicial) => {
  const r = new Map(); let ac = saldoInicial || 0;
  [...meses.keys()].sort(C.compara).forEach(c => { const t = meses.get(c); ac += t.e - t.s; r.set(c, ac); });
  return r;
};
/** Saldo no fim de `c` (também para meses sem lançamento). */
export const saldoEm = (meses, saldoInicial, c) => {
  let t = saldoInicial || 0;
  meses.forEach((v, k) => { if (C.compara(k, c) <= 0) t += v.e - v.s; });
  return t;
};

/** Soma por campo (categoria, cartão…) de um tipo, do maior para o menor. */
export const porCampo = (rows, campo, tipo = DEBITO) => {
  const m = new Map();
  rows.forEach(r => { if (r.tipo !== tipo) return; const k = r[campo] || 'Outros'; m.set(k, (m.get(k) || 0) + valor(r)); });
  return [...m.entries()].sort((a, b) => b[1] - a[1]);
};

/** Fatura de cada cartão/conta: em cartão, débitos menos estornos; em conta/dinheiro, só os gastos. */
export const faturas = (rows, formas) => {
  const m = new Map();
  rows.forEach(r => { const k = r.forma_pagamento || 'Outros'; const f = m.get(k) || { d: 0, c: 0 }; ehCredito(r) ? (f.c += valor(r)) : (f.d += valor(r)); m.set(k, f); });
  return [...m.entries()].filter(([, f]) => f.d > 0).map(([nome, f]) => {
    const cartao = formas.find(x => x.nome === nome)?.tipo === 'CARTAO';
    return { nome, total: cartao ? f.d - f.c : f.d, estornos: cartao ? f.c : 0 };
  }).sort((a, b) => b.total - a.total);
};

/** Compras que acabam em cada competência a partir de `desde`: última parcela lançada de cada compra parcelada e compras à vista. */
export const oQueAcaba = (rows, desde) => {
  const series = new Map();
  rows.forEach(r => {
    if (!parcelado(r) || ehCredito(r) || !r.competencia) return;
    const k = r.grupo?.startsWith('PARC:') ? r.grupo : [normalizar(r.descricao), r.forma_pagamento || '', valor(r).toFixed(2), r.parcelas_total].join('|');
    const s = series.get(k) || { descricao: semParcela(r.descricao), forma_pagamento: r.forma_pagamento, categoria: r.categoria, valor: valor(r), total: r.parcelas_total, fim: r.competencia };
    if (C.compara(r.competencia, s.fim) > 0) s.fim = r.competencia;
    series.set(k, s);
  });
  const porMesFim = new Map(), add = (c, item) => porMesFim.set(c, [...(porMesFim.get(c) || []), item]);
  series.forEach(s => { if (C.compara(s.fim, desde) >= 0) add(s.fim, s); });
  rows.forEach(r => {
    if (parcelado(r) || r.recorrente || ehCredito(r) || !r.competencia || C.compara(r.competencia, desde) < 0) return;
    add(r.competencia, { descricao: r.descricao, forma_pagamento: r.forma_pagamento, categoria: r.categoria, valor: valor(r), total: 1, avista: true });
  });
  return [...porMesFim.entries()].sort((a, b) => C.compara(a[0], b[0]));
};

/** Saídas recorrentes (recorrentes e assinaturas) de uma competência, uma por recorrência. */
export const recorrentesDoMes = (rows, c) => {
  const m = new Map();
  rows.forEach(r => { if (r.recorrente && !ehCredito(r) && r.competencia === c && !m.has(chave(r))) m.set(chave(r), r); });
  return [...m.values()].sort((a, b) => valor(b) - valor(a));
};

/** Gastos por dia da semana (0 = domingo), pela data da compra ou do vencimento. */
export const porDiaDaSemana = rows => {
  const total = new Array(7).fill(0), qtd = new Array(7).fill(0);
  rows.forEach(r => { if (r.tipo !== DEBITO || r.dia_semana == null) return; total[r.dia_semana] += valor(r); qtd[r.dia_semana]++; });
  return { total, qtd };
};
