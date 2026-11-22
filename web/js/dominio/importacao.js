// Importação de fatura/extrato: leitura do arquivo, classificação das linhas e plano de gravação.
import * as C from './competencia.js?v=__BUILD__';
import { CREDITO, DEBITO, lerValor, registro, parcelas, valor, comRepeticao, vencimento } from './lancamento.js?v=__BUILD__';
import { normalizar, similaridade, parecidas, parcelaDe } from './texto.js?v=__BUILD__';

const lerData = v => {
  v = String(v || '').trim(); let m;
  if ((m = v.match(/^(\d{4})-(\d{2})-(\d{2})/))) return `${m[1]}-${m[2]}-${m[3]}`;
  if ((m = v.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})/))) return `${m[3].length === 2 ? '20' + m[3] : m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  if ((m = v.match(/^(\d{4})(\d{2})(\d{2})/))) return `${m[1]}-${m[2]}-${m[3]}`;
  return null;
};

const lerCSV = txt => {
  const linhas = txt.replace(/^﻿/, '').split(/\r?\n/).filter(l => l.trim());
  if (!linhas.length) return [];
  const sep = (linhas[0].match(/;/g) || []).length > (linhas[0].match(/,/g) || []).length ? ';' : ',';
  const campos = l => { const out = []; let cur = '', aspas = false; for (const ch of l) { if (ch === '"') { aspas = !aspas; continue; } if (ch === sep && !aspas) { out.push(cur); cur = ''; } else cur += ch; } out.push(cur); return out.map(x => x.trim()); };
  const cab = campos(linhas[0]).map(normalizar), col = (...ks) => cab.findIndex(h => ks.some(k => h.includes(k)));
  let iD = col('data', 'date'), iT = col('descri', 'title', 'estabelecimento', 'lancamento', 'historico', 'titulo'), iV = col('valor', 'amount', 'value'), ini = 1;
  if (iD < 0 || iT < 0 || iV < 0) { iD = 0; iT = 1; iV = 2; ini = 0; }
  return linhas.slice(ini).map(campos).map(c => ({ data: lerData(c[iD]), descricao: c[iT], valor: lerValor(c[iV]) }));
};
const lerOFX = txt => [...txt.matchAll(/<STMTTRN>([\s\S]*?)(<\/STMTTRN>|(?=<STMTTRN>))/gi)].map(m => {
  const tag = t => (m[1].match(new RegExp('<' + t + '>([^<\r\n]*)', 'i')) || [])[1]?.trim();
  return { data: lerData(tag('DTPOSTED')), descricao: tag('MEMO') || tag('NAME'), valor: -lerValor(tag('TRNAMT') || '0') };
});

/** Linhas de um arquivo CSV/OFX: valor positivo = gasto, negativo = crédito/estorno. */
export const lerArquivo = (txt, nome) =>
  (/\.ofx$/i.test(nome) || /<OFX>/i.test(txt) ? lerOFX(txt) : lerCSV(txt))
    .filter(x => x.descricao && !isNaN(x.valor))
    .map(x => { const [pa, pt] = parcelaDe(x.descricao); return { ...x, parcela_atual: pa, parcela_total: pt }; });

/** Competência pelo nome do arquivo (ex.: "Nubank_2026-10-05.csv" → "10/2026"). */
export const competenciaDoNome = nome => { const m = (nome || '').match(/(20\d{2})[-_](\d{2})[-_]\d{2}/); return m ? m[2] + '/' + m[1] : null; };

/** Índice descrição → contagem de categorias, para sugerir pela mais usada. */
export const indiceCategorias = rows => {
  const m = new Map();
  rows.forEach(r => { if (!r.categoria) return; const k = normalizar(r.descricao); if (!k) return; const c = m.get(k) || {}; c[r.categoria] = (c[r.categoria] || 0) + 1; m.set(k, c); });
  return m;
};
export const sugerirCategoria = (indice, desc) => {
  const k = normalizar(desc); if (!k) return null;
  let c = indice.get(k);
  if (!c) { let melhor = 0; for (const [kk, v] of indice) { const s = similaridade(k, kk); if (s > melhor && s >= 0.6) { melhor = s; c = v; } } }
  return c ? Object.entries(c).sort((a, b) => b[1] - a[1])[0][0] : null;
};

// Casa cada linha com no máximo um lançamento existente do cartão:
// 1º pela data da compra (±2 dias); depois, pelo mesmo mês de competência
// (parcelas e recorrentes trazem no banco uma data diferente da original; preço de assinatura varia centavos).
const marcarDuplicados = (L, existentes) => {
  const usados = new Set();
  const cands = (x, ok, tol = 0.01) => existentes.filter(r => !usados.has(r.id) && Math.abs(valor(r) - x.valor) <= tol && parecidas(x.descricao, r.descricao) && ok(r));
  L.forEach(x => {
    if (!x.data || x.parcela_atual > 1) return;
    const c = cands(x, r => r.data_transacao && C.diasEntre(x.data, r.data_transacao) <= 2).sort((a, b) => C.diasEntre(x.data, a.data_transacao) - C.diasEntre(x.data, b.data_transacao))[0];
    if (c) { x.dup = c; usados.add(c.id); }
  });
  L.forEach(x => {
    if (x.dup) return;
    const c = cands(x, r => r.competencia === x.competencia, Math.max(0.01, x.valor * 0.01))
      .sort((a, b) => (b.parcela_num === x.parcela_atual) - (a.parcela_num === x.parcela_atual) || similaridade(x.descricao, b.descricao) - similaridade(x.descricao, a.descricao))[0];
    if (c) { x.dup = c; usados.add(c.id); }
  });
};

/**
 * Linhas lidas → itens para revisão, com situação ('novo' | 'proj' = confirma projeção | 'dup' = já lançado | 'cred'),
 * categoria sugerida, marca de assinatura e se vem selecionado.
 */
export const classificar = (linhas, rows, cartao, comp) => {
  const doCartao = rows.filter(r => r.forma_pagamento === cartao), indice = indiceCategorias(rows);
  const L = linhas.map((it, i) => ({ i, data: it.data, descricao: String(it.descricao).trim(), valor: Math.abs(+it.valor), tipo: it.valor < 0 ? CREDITO : DEBITO,
    parcela_atual: +it.parcela_atual || 1, parcela_total: +it.parcela_total || 1, competencia: comp }));
  marcarDuplicados(L, doCartao);
  const assinaturas = doCartao.filter(r => r.assinatura);
  L.forEach(x => {
    x.assinatura = x.tipo === DEBITO && (!!x.dup?.assinatura || assinaturas.some(r => parecidas(r.descricao, x.descricao)));
    x.categoria = x.dup?.categoria || sugerirCategoria(indice, x.descricao) || '';
    x.situacao = x.dup ? (x.dup.projetado ? 'proj' : 'dup') : x.tipo === CREDITO ? 'cred' : 'novo';
    x.sel = x.situacao === 'novo' || x.situacao === 'proj';
  });
  return L;
};

/** O que gravar para os itens selecionados: linhas novas (com parcelas futuras) e projeções confirmadas. */
export const plano = (selecionados, rows, forma, comp) => {
  const cartao = forma.nome, venc = vencimento(forma, comp);
  const inserir = [], confirmar = [];
  selecionados.forEach(x => {
    if (x.situacao === 'proj') {
      confirmar.push({ id: x.dup.id, campos: { projetado: false, valor: x.valor, data_transacao: x.data || null, categoria: x.categoria || x.dup.categoria || null } });
      return;
    }
    const base = { descricao: x.descricao, valor: x.valor, tipo: x.tipo, categoria: x.categoria, forma_pagamento: cartao, competencia: comp,
      data_transacao: x.parcela_atual > 1 ? null : x.data, data_pagamento: venc, projetado: false, ...comRepeticao(x.assinatura ? 'assinatura' : '') };
    if (x.parcela_total > 1)
      inserir.push(...parcelas(base, { de: x.parcela_atual, total: x.parcela_total,
        existe: c => rows.some(r => r.forma_pagamento === cartao && r.competencia === c && Math.abs(valor(r) - x.valor) <= 0.01 && parecidas(r.descricao, x.descricao)) }));
    else inserir.push(registro({ ...base, parcelas_total: 1 }));
  });
  return { inserir, confirmar };
};
