// Lançamentos que se repetem todo mês (recorrentes e assinaturas).
// Uma recorrência é identificada pela descrição + cartão/conta; projeções são os meses futuros gerados a partir do último lançamento real.
import * as C from './competencia.js?v=__BUILD__';
import { registro, valor } from './lancamento.js?v=__BUILD__';

export const chave = r => (r.descricao || '') + '|' + (r.forma_pagamento || '');
const mesma = (a, b) => chave(a) === chave(b);

/** "Daqui pra frente" a partir de `r`: a competência do mês atual ou a de `r`, a que for mais tarde. */
const inicioFuturo = r => (C.compara(C.atual(), r.competencia) > 0 ? C.atual() : r.competencia);

/** Lançamentos da mesma recorrência de `r` a partir da competência `desde` (inclusive). */
export const daRecorrencia = (rows, r, desde, { soProjecoes = false } = {}) =>
  rows.filter(x => x.recorrente && mesma(x, r) && C.compara(x.competencia, desde) >= 0 && (!soProjecoes || x.projetado));

/** Os lançamentos seguintes de `r` (não vencidos), sem o próprio `r`. */
export const seguintes = (rows, r) => daRecorrencia(rows, r, inicioFuturo(r)).filter(x => x.id !== r.id);

/** Projeções que faltam até a competência `ate`, a partir do último lançamento real de cada recorrência. */
export const projecoesAte = (rows, ate) => {
  const ultimo = new Map(), existe = new Set(rows.map(r => chave(r) + '@' + r.competencia));
  rows.filter(r => r.recorrente && !r.projetado && r.competencia).forEach(r => {
    const u = ultimo.get(chave(r));
    if (!u || C.compara(r.competencia, u.competencia) > 0) ultimo.set(chave(r), r);
  });
  const novas = [];
  for (const b of ultimo.values()) {
    for (let c = C.desloca(b.competencia, 1); C.compara(c, ate) <= 0; c = C.desloca(c, 1)) {
      if (existe.has(chave(b) + '@' + c)) continue;
      novas.push(registro({ ...b, competencia: c, data_transacao: null, data_pagamento: b.data_pagamento ? C.diaNoMes(c, C.dia(b.data_pagamento)) : null,
        parcelas_total: 1, parcela_num: null, projetado: true, grupo: null }));
    }
  }
  return novas;
};

/** Até onde projetar: a projeção mais distante, o último "Gerar até" usado e 12 meses à frente. */
export const horizonte = (rows, preferido) =>
  C.maisDistante([C.desloca(C.atual(), 11), ...(C.valida(preferido) ? [preferido] : []), ...rows.filter(r => r.projetado && r.competencia).map(r => r.competencia)]);

/** Projeções agrupadas por recorrência, para a tela de Projeções. */
export const itensProjetados = rows => {
  const m = new Map();
  rows.filter(r => r.projetado).forEach(r => {
    const g = m.get(chave(r)) || { modelo: r, qtd: 0, valor: 0, primeira: r.competencia, ultima: r.competencia };
    g.qtd++; g.valor = Math.max(g.valor, valor(r));
    if (C.compara(r.competencia, g.primeira) < 0) g.primeira = r.competencia;
    if (C.compara(r.competencia, g.ultima) > 0) g.ultima = r.competencia;
    m.set(chave(r), g);
  });
  return [...m.values()];
};
