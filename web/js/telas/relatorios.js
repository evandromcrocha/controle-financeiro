// Tela Relatórios: evolução, relatório mensal com saldo, o que acaba em cada mês, dia da semana e categorias.
import * as C from '../dominio/competencia.js?v=__BUILD__';
import { totaisDoMes, porCampo, oQueAcaba, recorrentesDoMes, porDiaDaSemana } from '../dominio/agregados.js?v=__BUILD__';
import { valor } from '../dominio/lancamento.js?v=__BUILD__';
import { estado, doMes } from '../estado.js?v=__BUILD__';
import { el, icon, brl, cor, barra, ponto, segmentado, etiquetaRepeticao, linhaVazia } from '../ui.js?v=__BUILD__';
import { abrirDetalhe, linhasDeSaldo, cabecalhoSaldo } from './detalhe.js?v=__BUILD__';

const DIAS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
const tela = { ano: String(new Date().getFullYear()) };
const card = (titulo, ...filhos) => el('div', { class: 'card', style: 'margin-top:16px' }, titulo ? el('h2', { style: 'margin-top:0' }, titulo) : null, ...filhos);
const legenda = (c, t) => el('span', { class: 'muted' }, el('span', { style: `display:inline-block;width:10px;height:10px;background:${c};border-radius:3px;margin-right:5px` }), t);
const coluna = (v, mx, c, t) => el('div', { title: t + ' ' + brl(v), style: `width:13px;height:${Math.max(2, v / mx * 150)}px;background:${c};border-radius:5px 5px 0 0` });

function evolucao() {
  // 12 meses terminando no mês atual (projeções futuras não empurram o gráfico)
  const meses = Array.from({ length: 12 }, (_, i) => C.desloca(C.atual(), i - 11)), mx = Math.max(1, ...meses.map(c => { const t = totaisDoMes(estado.meses, c); return Math.max(t.e, t.s); }));
  const graf = el('div', { style: 'display:flex;gap:10px;align-items:flex-end;height:200px;overflow-x:auto;padding-top:10px' }, ...meses.map(c => { const t = totaisDoMes(estado.meses, c);
    return el('div', { style: 'flex:1;min-width:44px;display:flex;flex-direction:column;align-items:center;gap:7px' },
      el('div', { style: 'display:flex;gap:4px;align-items:flex-end;height:150px' }, coluna(t.e, mx, 'var(--green)', 'Entradas'), coluna(t.s, mx, 'var(--red)', 'Saídas')),
      el('span', { class: 'muted', style: 'font-size:11px' }, c.slice(0, 3) + c.slice(5))); }));
  const c = card('Evolução mensal', graf, el('div', { style: 'display:flex;gap:16px;margin-top:12px;font-size:12px' }, legenda('var(--green)', 'Entradas'), legenda('var(--red)', 'Saídas')));
  c.style.marginTop = ''; return c;
}

function relatorioMensal(aoMudar) {
  const anos = [...new Set(estado.comps.map(C.ano))].sort();
  const doAno = estado.comps.filter(c => C.ano(c) === tela.ano).sort(C.compara);
  const tot = doAno.reduce((a, c) => { const t = totaisDoMes(estado.meses, c); return { e: a.e + t.e, s: a.s + t.s }; }, { e: 0, s: 0 });
  const tb = el('tbody', {}, linhasDeSaldo(doAno, c => abrirDetalhe('Lançamentos · ' + C.rotulo(c), doMes(c))),
    el('tr', { style: 'cursor:default;background:var(--surface-2)' }, el('td', { style: 'font-weight:600' }, 'Total ' + tela.ano), el('td', { class: 'amt', style: 'color:var(--green)' }, brl(tot.e)),
      el('td', { class: 'amt', style: 'color:var(--red)' }, brl(tot.s)), el('td', { class: 'amt' }, brl(tot.e - tot.s)), el('td', {})));
  return card(null, el('div', { style: 'display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:8px' },
    el('h2', { style: 'margin:0' }, 'Relatório mensal · saldo no fim de cada mês'), segmentado(anos.map(a => [a, a]), tela.ano, a => { tela.ano = a; aoMudar(); })),
  el('div', { class: 'tablewrap' }, el('table', {}, cabecalhoSaldo('Saldo final'), tb)));
}

/** Linha que abre/fecha um detalhe logo abaixo. */
const expansivel = (attrs, celulas, detalhe) => {
  const det = el('tr', { class: 'hidden', style: 'cursor:default;background:var(--surface-2)' }, el('td', { colspan: 4, style: 'padding:6px 12px 12px' }, ...detalhe));
  return [el('tr', { ...attrs, onclick: () => det.classList.toggle('hidden') }, ...celulas), det];
};
const item = (categoria, titulo, sub, v) => el('div', { class: 'lrow', style: 'padding:7px 0' }, ponto(categoria),
  el('span', { style: 'flex:1;min-width:0' }, el('div', { style: 'font-weight:600' }, titulo), sub), el('b', { style: 'font-variant-numeric:tabular-nums' }, brl(v)));

function oQueAcabaCard() {
  const hoje = C.atual(), tb = el('tbody');
  const recs = recorrentesDoMes(estado.rows, hoje), totRec = recs.reduce((a, r) => a + valor(r), 0);
  if (recs.length) tb.append(...expansivel({ title: 'Ver recorrentes', style: 'background:var(--primary-weak)' },
    [el('td', { style: 'font-weight:600' }, '🔁 Recorrentes e assinaturas'), el('td', { class: 'muted' }, `${recs.length} item(ns) · todo mês`),
      el('td', { class: 'amt', style: 'color:var(--primary)' }, brl(totRec)), el('td', { class: 'amt muted' }, 'não terminam')],
    recs.map(r => item(r.categoria, r.descricao, el('div', { style: 'display:flex;gap:6px;align-items:center' }, etiquetaRepeticao(r, 'margin:0'), el('span', { class: 'muted', style: 'font-size:12px' }, r.forma_pagamento || '—')), valor(r)))));
  let acum = 0;
  const meses = oQueAcaba(estado.rows, hoje);
  meses.forEach(([mes, lista]) => {
    lista.sort((a, b) => b.valor - a.valor);
    const tot = lista.reduce((a, s) => a + s.valor, 0), parc = lista.filter(s => !s.avista), avista = lista.filter(s => s.avista);
    acum += tot;
    tb.append(...expansivel({ title: 'Ver compras' },
      [el('td', { style: 'font-weight:600;white-space:nowrap' }, C.rotulo(mes)), el('td', { class: 'muted' }, [parc.length ? `${parc.length} parcelada(s)` : '', avista.length ? `${avista.length} à vista` : ''].filter(Boolean).join(' · ')),
        el('td', { class: 'amt', style: 'color:var(--red)' }, brl(tot)), el('td', { class: 'amt', style: 'color:var(--green)' }, brl(acum))],
      [['Parcelas que terminam', parc], ['Compras à vista', avista]].filter(([, g]) => g.length).flatMap(([tit, g]) => [
        el('div', { class: 'muted', style: 'font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;margin:8px 0 2px' }, `${tit} · ${brl(g.reduce((a, s) => a + s.valor, 0))}`),
        ...g.map(s => item(s.categoria, s.descricao, el('div', { class: 'muted', style: 'font-size:12px' }, `${s.forma_pagamento || '—'} · ` + (s.avista ? 'à vista' : `${s.total}x de ${brl(s.valor)}`)), s.valor))])));
  });
  if (!meses.length) { const vazio = linhaVazia(4, 'Nenhuma compra que acabe a partir deste mês.', 18); vazio.style.cursor = 'default'; tb.append(vazio); }
  return card(null, el('h2', { style: 'margin:0 0 4px' }, 'O que acaba em cada mês'),
    el('div', { class: 'muted', style: 'font-size:13px;margin-bottom:12px' }, 'Em cada mês: compras parceladas que pagam a última parcela e compras à vista daquele mês. O total é quanto deixa de sair a partir do mês seguinte. A primeira linha mostra as saídas recorrentes do mês atual, que continuam. Clique em uma linha para ver os itens.'),
    el('div', { class: 'tablewrap' }, el('table', {}, el('thead', {}, el('tr', {}, el('th', {}, 'Mês'), el('th', {}, 'Compras que acabam'), el('th', { class: 'amt' }, 'Total que termina'), el('th', { class: 'amt' }, 'Libera por mês (acumulado)'))), tb)));
}

function diaDaSemana() {
  const { total, qtd } = porDiaDaSemana(estado.rows), mx = Math.max(1, ...total), soma = total.reduce((a, b) => a + b, 0), top = total.indexOf(Math.max(...total));
  return card('Gastos por dia da semana',
    soma > 0 ? el('div', { class: 'pend-banner', style: 'background:var(--primary-weak);border-color:var(--primary);margin-bottom:14px' }, icon('chart', 'ico sm'),
      el('span', {}, 'Você gasta mais ', el('b', {}, DIAS[top]), `: ${brl(total[top])} (${(total[top] / soma * 100).toFixed(1)}% do total)`)) : null,
    ...DIAS.map((n, i) => el('div', { style: 'margin-bottom:11px' }, el('div', { style: 'display:flex;justify-content:space-between;margin-bottom:5px' },
      el('span', { style: i === top ? 'font-weight:700' : '' }, n), el('span', { class: 'muted' }, brl(total[i]) + (qtd[i] ? ` · ${qtd[i]}x` : ''))),
    barra(total[i] / mx * 100, i === top ? 'var(--primary)' : 'var(--info)'))));
}

function categorias() {
  const pc = porCampo(estado.rows, 'categoria'), tot = pc.reduce((a, [, x]) => a + x, 0);
  return card('Gastos por categoria (todo período) · ' + brl(tot), ...pc.map(([n, v]) => { const p = tot ? v / tot * 100 : 0;
    return el('div', { style: 'margin-bottom:12px' }, el('div', { style: 'display:flex;justify-content:space-between;margin-bottom:6px' },
      el('span', { style: 'display:flex;align-items:center;gap:8px' }, ponto(n), n), el('span', { class: 'muted' }, brl(v) + ' · ' + p.toFixed(1) + '%')), barra(p, cor(n))); }));
}

export function render(v) {
  const redesenha = () => { v.replaceChildren(); render(v); };
  v.append(evolucao(), relatorioMensal(redesenha), oQueAcabaCard(), diaDaSemana(), categorias());
}
