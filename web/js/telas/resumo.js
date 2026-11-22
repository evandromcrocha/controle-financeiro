// Tela Resumo: indicadores do mês, saldo, maiores gastos, metas, categorias e cartões.
import * as C from '../dominio/competencia.js?v=__BUILD__';
import { ehCredito, valor, pendente } from '../dominio/lancamento.js?v=__BUILD__';
import { totaisDoMes as totais, saldoEm, porCampo, faturas } from '../dominio/agregados.js?v=__BUILD__';
import { estado, doMes } from '../estado.js?v=__BUILD__';
import { el, icon, brl, cor, corSinal, NS, barra, ponto } from '../ui.js?v=__BUILD__';
import { abrirDetalhe, abrirSaldo } from './detalhe.js?v=__BUILD__';
import { abrirLancamento } from './lancamentoForm.js?v=__BUILD__';
import { abrirMeta } from './ajustes.js?v=__BUILD__';

const svg = (tag, attrs, pai) => { const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); pai?.append(e); return e; };

function rosca(fatias, total) {
  const size = 170, rad = 68, cx = size / 2, circ = 2 * Math.PI * rad; let off = 0;
  const s = svg('svg', { viewBox: `0 0 ${size} ${size}`, width: size, height: size });
  const anel = { cx, cy: cx, r: rad, fill: 'none', 'stroke-width': '16' };
  svg('circle', { ...anel, stroke: 'var(--surface-2)' }, s);
  fatias.forEach(([n, v]) => { const frac = total ? v / total : 0;
    svg('circle', { ...anel, stroke: cor(n), 'stroke-dasharray': `${circ * frac} ${circ}`, 'stroke-dashoffset': -off * circ, transform: `rotate(-90 ${cx} ${cx})`, 'stroke-linecap': 'butt' }, s); off += frac; });
  svg('text', { x: cx, y: cx - 2, 'text-anchor': 'middle', fill: 'var(--muted)', 'font-size': '11' }, s).textContent = 'Total gasto';
  svg('text', { x: cx, y: cx + 16, 'text-anchor': 'middle', fill: 'var(--text)', 'font-size': '16', 'font-weight': '800' }, s).textContent = brl(total).replace('R$', 'R$ ');
  return s;
}

function area(vals, rotulos, destaque) {
  const W = 640, H = 180, P = 24, n = vals.length, mx = Math.max(...vals, 0), mn = Math.min(...vals, 0), rg = (mx - mn) || 1;
  const x = i => P + i * (W - 2 * P) / Math.max(1, n - 1), y = v => P + (mx - v) / rg * (H - 2 * P);
  const s = svg('svg', { viewBox: `0 0 ${W} ${H + 18}`, width: '100%' });
  svg('defs', {}, s).innerHTML = '<linearGradient id="ga" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="var(--primary)" stop-opacity=".25"/><stop offset="1" stop-color="var(--primary)" stop-opacity="0"/></linearGradient>';
  svg('line', { x1: P, x2: W - P, y1: y(0), y2: y(0), stroke: 'var(--border-strong)', 'stroke-dasharray': '4 4' }, s);
  const pts = vals.map((v, i) => `${x(i)},${y(v)}`).join(' ');
  svg('polygon', { points: `${x(0)},${y(mn)} ${pts} ${x(n - 1)},${y(mn)}`, fill: 'url(#ga)' }, s);
  svg('polyline', { points: pts, fill: 'none', stroke: 'var(--primary)', 'stroke-width': 2.5, 'stroke-linejoin': 'round' }, s);
  vals.forEach((v, i) => { const on = i === destaque;
    const c = svg('circle', { cx: x(i), cy: y(v), r: on ? 5 : 3.5, fill: on ? 'var(--primary)' : 'var(--surface)', stroke: 'var(--primary)', 'stroke-width': 2 }, s);
    svg('title', {}, c).textContent = rotulos[i] + ': ' + brl(v);
    svg('text', { x: x(i), y: H + 12, 'text-anchor': 'middle', 'font-size': 11, fill: 'var(--muted)' }, s).textContent = rotulos[i]; });
  return s;
}

function cardMetas(mes, cl) {
  const c = el('div', { class: 'card', style: 'margin-top:16px' }, el('div', { style: 'display:flex;justify-content:space-between;align-items:center;gap:10px' },
    el('h2', { style: 'margin:0' }, 'Metas de orçamento · ' + cl), el('button', { class: 'btn sm ghost', onclick: () => abrirMeta() }, icon('plus', 'ico sm'), 'Nova meta')));
  if (!estado.orc.length) return c.append(el('div', { class: 'muted', style: 'margin-top:10px' }, 'Defina um limite mensal por categoria e acompanhe aqui quanto já foi usado.')), c;
  const gasto = new Map(porCampo(mes, 'categoria'));
  const grid = el('div', { style: 'display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:10px 22px;margin-top:14px' });
  estado.orc.map(o => ({ ...o, g: gasto.get(o.categoria) || 0 })).sort((a, b) => b.g / b.valor - a.g / a.valor).forEach(o => {
    const p = o.g / o.valor * 100, cr = p >= 100 ? 'var(--red)' : p >= 80 ? 'var(--amber)' : 'var(--green)';
    grid.append(el('div', { class: 'clickrow', title: 'Ver lançamentos', onclick: () => abrirDetalhe(o.categoria + ' · ' + cl, mes.filter(r => r.categoria === o.categoria && !ehCredito(r))) },
      el('div', { style: 'display:flex;justify-content:space-between;gap:8px;margin-bottom:6px' }, el('span', { style: 'font-weight:600' }, o.categoria),
        el('span', { style: `color:${cr};font-weight:600;font-size:13px` }, p >= 100 ? 'Estourou' : p >= 80 ? 'Atenção' : Math.round(p) + '%')),
      barra(p, cr),
      el('div', { class: 'muted', style: 'font-size:12px;margin-top:5px;font-variant-numeric:tabular-nums' },
        `${brl(o.g)} de ${brl(+o.valor)} · ` + (o.valor - o.g >= 0 ? 'restam ' + brl(o.valor - o.g) : 'passou ' + brl(o.g - o.valor)))));
  });
  return c.append(grid), c;
}

export function render(v) {
  const mes = doMes(), cl = C.rotulo(estado.comp), { e, s } = totais(estado.meses, estado.comp), ant = totais(estado.meses, C.desloca(estado.comp, -1));
  const np = mes.filter(pendente).length;
  if (np) v.append(el('div', { class: 'pend-banner' }, icon('sparkle', 'ico sm'), el('span', {}, `${np} lançamento(s) para categorizar — abra Lançamentos › Pendentes.`)));
  const variacao = (a, b, menosEhBom) => { if (!b) return null; const p = (a - b) / b * 100, bom = menosEhBom ? p <= 0 : p >= 0;
    return el('span', { class: 'delta', style: `background:${bom ? 'var(--green-weak)' : 'var(--red-weak)'};color:${bom ? 'var(--green)' : 'var(--red)'}` }, (p >= 0 ? '▲ ' : '▼ ') + Math.abs(p).toFixed(1) + '% vs mês anterior'); };
  const kpi = (lb, val, c, ic, bg, extra, onclick) => el('button', { class: 'card kpi click', onclick, title: 'Ver detalhes' },
    el('div', { class: 'lbl' }, lb, el('span', { class: 'chip', style: `background:${bg};color:${c}` }, icon(ic, 'ico sm'))), el('div', { class: 'val', style: `color:${c}` }, brl(val)), ...extra);
  const dica = t => el('span', { class: 'hint' }, t), acum = saldoEm(estado.meses, estado.saldoIni, estado.comp);
  v.append(el('div', { class: 'kpis' },
    kpi('Entradas', e, 'var(--green)', 'down', 'var(--green-weak)', [variacao(e, ant.e), dica('Clique para ver o detalhe')], () => abrirDetalhe('Entradas · ' + cl, mes.filter(ehCredito))),
    kpi('Saídas', s, 'var(--red)', 'up', 'var(--red-weak)', [variacao(s, ant.s, true), dica('Clique para ver o detalhe')], () => abrirDetalhe('Saídas · ' + cl, mes.filter(r => !ehCredito(r)))),
    kpi('Resultado do mês', e - s, corSinal(e - s), 'wallet', 'var(--primary-weak)', [dica(e ? `Taxa de poupança: ${((e - s) / e * 100).toFixed(1)}%` : 'Sem entradas no mês')], () => abrirDetalhe('Todos os lançamentos · ' + cl, mes)),
    kpi('Saldo acumulado', acum, acum >= 0 ? 'var(--text)' : 'var(--red)', 'chart', 'var(--surface-2)', [dica('Quanto sobra no fim de ' + cl + ' · clique')], abrirSaldo)));

  const ultimos = [-5, -4, -3, -2, -1, 0].map(d => C.desloca(estado.comp, d));
  const cSaldo = el('div', { class: 'card' }, el('h2', { style: 'margin-top:0' }, 'Saldo no fim de cada mês'), el('div', { class: 'muted', style: 'font-size:12px;margin:-6px 0 6px' }, 'Últimos 6 meses até ' + cl),
    area(ultimos.map(c => saldoEm(estado.meses, estado.saldoIni, c)), ultimos.map(C.rotuloCurto), 5));
  const maiores = mes.filter(r => !ehCredito(r)).sort((a, b) => valor(b) - valor(a)).slice(0, 5);
  const cMaiores = el('div', { class: 'card' }, el('h2', { style: 'margin-top:0' }, 'Maiores gastos do mês'),
    ...maiores.map(r => el('div', { class: 'lrow', style: 'cursor:pointer', onclick: () => abrirLancamento(r) }, ponto(r.categoria),
      el('span', { style: 'flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap' }, r.descricao), el('b', { style: 'font-variant-numeric:tabular-nums' }, brl(valor(r))))),
    maiores.length ? null : el('div', { class: 'muted' }, 'Sem gastos.'));
  v.append(el('div', { class: 'grid3', style: 'margin-top:16px' }, cSaldo, cMaiores), cardMetas(mes, cl));

  const pc = porCampo(mes, 'categoria'), tot = pc.reduce((a, [, x]) => a + x, 0), top = pc.slice(0, 6);
  const cCat = el('div', { class: 'card' }, el('h2', { style: 'margin-top:0' }, 'Distribuição por categoria'),
    el('div', { class: 'donutwrap', style: 'display:flex;gap:20px;align-items:center;flex-wrap:wrap' }, el('div', {}, top.length ? rosca(top, tot) : el('div', { class: 'muted' }, 'Sem gastos.')),
      el('div', { style: 'flex:1;min-width:160px' }, ...top.map(([n, val]) => el('div', { class: 'lrow', style: 'cursor:pointer', title: 'Ver lançamentos', onclick: () => abrirDetalhe(n + ' · ' + cl, mes.filter(r => (r.categoria || 'Outros') === n && !ehCredito(r))) },
        ponto(n), el('span', { style: 'flex:1' }, n), el('span', { class: 'muted', style: 'font-size:12px' }, (val / tot * 100).toFixed(0) + '%'), el('b', { style: 'font-variant-numeric:tabular-nums' }, brl(val)))))));
  const fat = faturas(mes, estado.formas), mx = Math.max(1, ...fat.map(f => f.total));
  const cFat = el('div', { class: 'card' }, el('h2', { style: 'margin-top:0' }, 'Gastos por cartão / conta'), el('div', { class: 'muted', style: 'font-size:12px;margin:-6px 0 12px' }, 'Clique em um cartão para ver os lançamentos'),
    ...fat.map(f => el('div', { class: 'clickrow', title: 'Ver lançamentos', onclick: () => abrirDetalhe(f.nome + ' · ' + cl, mes.filter(r => (r.forma_pagamento || 'Outros') === f.nome)) },
      el('div', { style: 'display:flex;justify-content:space-between;margin-bottom:6px' }, el('span', { style: 'font-weight:500' }, f.nome),
        el('span', { class: 'muted', style: 'font-variant-numeric:tabular-nums;text-align:right' }, brl(f.total), f.estornos ? el('div', { style: 'font-size:11px;color:var(--green)' }, 'inclui estornos de ' + brl(f.estornos)) : null)),
      barra(f.total / mx * 100, cor(f.nome)))),
    fat.length ? null : el('div', { class: 'muted' }, 'Sem gastos.'));
  v.append(el('div', { class: 'grid2', style: 'margin-top:16px' }, cCat, cFat));
}
