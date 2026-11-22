// Peças de interface compartilhadas pelas telas: elementos, ícones, modal, tabelas ordenáveis, etiquetas.
import * as C from './dominio/competencia.js?v=__BUILD__';
import { ehCredito, valor, pendente } from './dominio/lancamento.js?v=__BUILD__';

export const $ = s => document.querySelector(s);
export const el = (t, p = {}, ...ch) => {
  const e = document.createElement(t);
  for (const [k, v] of Object.entries(p)) {
    if (k === 'class') e.className = v; else if (k === 'html') e.innerHTML = v;
    else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
    else if (v != null && v !== false) e.setAttribute(k, v === true ? '' : v);
  }
  for (const c of ch.flat()) if (c != null) e.append(c.nodeType ? c : document.createTextNode(c));
  return e;
};

export const NS = 'http://www.w3.org/2000/svg';
const ICON = { home: ['M3 11l9-8 9 8', 'M5 21V11h14v10'], list: ['M8 6h13', 'M8 12h13', 'M8 18h13', 'M3 6h.01', 'M3 12h.01', 'M3 18h.01'], chart: ['M3 3v18h18', 'M18 9l-5 5-3-3-4 4'], gear: ['M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z', 'M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-2.7 1.1V21a2 2 0 1 1-4 0v-.1A1.6 1.6 0 0 0 7 19.4a1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0-1.1-2.7H1a2 2 0 1 1 0-4h.1A1.6 1.6 0 0 0 2.6 7a1.6 1.6 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3H7a1.6 1.6 0 0 0 1-1.5V1a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 2.7 1.1 1.6 1.6 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8V7a1.6 1.6 0 0 0 1.5 1H23a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1z'], plus: ['M12 5v14', 'M5 12h14'], search: ['M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16z', 'M21 21l-4.3-4.3'], doc: ['M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z', 'M14 2v6h6'], sparkle: ['M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z'], trash: ['M3 6h18', 'M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6', 'M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2'], up: ['M12 19V5', 'M5 12l7-7 7 7'], down: ['M12 5v14', 'M5 12l7 7 7-7'], moon: ['M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8z'], sun: ['M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10z', 'M12 1v2', 'M12 21v2', 'M4.2 4.2l1.4 1.4', 'M18.4 18.4l1.4 1.4', 'M1 12h2', 'M21 12h2', 'M4.2 19.8l1.4-1.4', 'M18.4 5.6l1.4-1.4'], wallet: ['M21 12V7H5a2 2 0 0 1 0-4h14v4', 'M3 5v14a2 2 0 0 0 2 2h16v-5', 'M18 12a2 2 0 0 0 0 4h4v-4z'], tag: ['M20.6 13.4L12 22l-9-9V3h10l7.6 7.6a2 2 0 0 1 0 2.8z', 'M7 7h.01'] };
export const icon = (name, cls = 'ico') => {
  const s = document.createElementNS(NS, 'svg'); s.setAttribute('viewBox', '0 0 24 24'); s.setAttribute('class', cls);
  (ICON[name] || []).forEach(d => { const p = document.createElementNS(NS, 'path'); p.setAttribute('d', d); s.append(p); });
  return s;
};

export const brl = v => (v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const PAL = ['#2563eb', '#059669', '#f04438', '#d97706', '#0ea5e9', '#7c3aed', '#0891b2', '#db2777', '#ca8a04', '#4f46e5', '#15803d', '#e11d48'];
export const cor = k => { k = k || ''; let h = 0; for (let i = 0; i < k.length; i++) h = (h * 31 + k.charCodeAt(i)) >>> 0; return PAL[h % PAL.length]; };
export const corSinal = v => (v >= 0 ? 'var(--green)' : 'var(--red)');

export const toast = msg => { const t = el('div', { class: 'toast' }, msg); document.body.append(t); setTimeout(() => { t.style.opacity = 0; setTimeout(() => t.remove(), 200); }, 4000); };

/** Executa `fn` com o botão desabilitado; erros viram aviso. */
export const ocupado = async (botao, fn, texto) => {
  const antes = botao.textContent; botao.disabled = true; if (texto) botao.textContent = texto;
  try { return await fn(); } catch (e) { toast(e.message || String(e)); } finally { botao.disabled = false; if (texto) botao.textContent = antes; }
};

/**
 * Abre um modal. `conteudo(fechar)` devolve o corpo; com `titulo`, ganha cabeçalho com botão de fechar.
 * Fecha com Esc, clique fora ou `fechar()`; `aoFechar` roda uma vez em qualquer caso.
 */
export const modal = (conteudo, { titulo, sub, largura = '', aoFechar } = {}) => {
  const bg = el('div', { class: 'modal-bg', onclick: e => { if (e.target === bg) fechar(); } });
  const esc = e => { if (e.key === 'Escape') fechar(); };
  function fechar() { if (!bg.isConnected) return; bg.remove(); document.removeEventListener('keydown', esc); aoFechar?.(); }
  const m = el('div', { class: 'modal' + (largura ? ' ' + largura : '') });
  if (titulo) m.append(el('div', { class: 'mhead' }, el('div', {}, el('h3', {}, titulo), sub ? el('div', { class: 'muted', style: 'font-size:13px' }, sub) : null),
    el('button', { class: 'iconbtn', onclick: fechar, title: 'Fechar', 'aria-label': 'Fechar' }, '✕')));
  m.append(conteudo(fechar));
  bg.append(m); document.body.append(bg); document.addEventListener('keydown', esc);
  return fechar;
};

/** Pergunta com botões; resolve com o valor do botão escolhido ou null se fechar. */
export const escolher = (titulo, texto, opcoes) => new Promise(res => {
  let valor = null;
  modal(fechar => el('div', {}, el('p', { class: 'muted', style: 'font-size:14px' }, texto),
    ...opcoes.map(([t, v, cls]) => el('button', { class: 'btn ' + (cls || ''), style: 'width:100%;margin-top:10px', onclick: () => { valor = v; fechar(); } }, t)),
    el('button', { class: 'btn ghost', style: 'width:100%;margin-top:10px', onclick: fechar }, 'Cancelar')),
  { titulo, aoFechar: () => res(valor) });
});

export const campo = (rotulo, no, cls) => el('div', { class: 'fld' + (cls ? ' ' + cls : ''), 'data-lab': rotulo }, el('label', {}, rotulo), no);

/** Seletor de mês ‹ Mês Ano ›; `limites` opcional [min, max]. */
export const navMes = (inicial, aoMudar, limites) => {
  let c = inicial; const txt = el('span', { class: 'cv' }, C.rotulo(c));
  const passo = d => { const n = C.desloca(c, d); if (limites && (C.compara(n, limites[0]) < 0 || C.compara(n, limites[1]) > 0)) return; c = n; txt.textContent = C.rotulo(c); aoMudar(c); };
  return el('div', { class: 'compnav' }, el('button', { type: 'button', class: 'iconbtn', title: 'Mês anterior', onclick: () => passo(-1) }, '‹'), txt,
    el('button', { type: 'button', class: 'iconbtn', title: 'Próximo mês', onclick: () => passo(1) }, '›'));
};

/** Select a partir de [valor, texto]; `vazio` adiciona a opção '' no topo. */
export const selecao = (opcoes, atual, aoMudar, { vazio, ...attrs } = {}) => {
  const s = el('select', { ...attrs, onchange: e => aoMudar(e.target.value) });
  if (vazio != null) s.append(el('option', { value: '' }, vazio));
  opcoes.forEach(([v, t]) => s.append(el('option', { value: v, ...(v === atual ? { selected: 1 } : {}) }, t ?? v)));
  return s;
};

/** Botões exclusivos (segmentado). */
export const segmentado = (opcoes, atual, aoMudar, attrs = {}) => {
  const seg = el('div', { class: 'seg', ...attrs });
  const pinta = () => [...seg.children].forEach((b, i) => { b.className = opcoes[i][0] === atual ? 'on' + (opcoes[i][2] ? ' ' + opcoes[i][2] : '') : ''; });
  opcoes.forEach(([k, t]) => seg.append(el('button', { type: 'button', onclick: () => { atual = k; pinta(); aoMudar(k); } }, t)));
  pinta(); return seg;
};

/** Entrada/Saída (pinta de verde ou vermelho). */
export const seletorTipo = (atual, aoMudar) => {
  const opt = [['DÉBITO', 'Saída', 'var(--red)'], ['CRÉDITO', 'Entrada', 'var(--green)']];
  const seg = el('div', { class: 'seg', style: 'width:100%;margin-top:14px' });
  const pinta = () => [...seg.children].forEach((x, i) => { const on = opt[i][0] === atual; x.className = on ? 'on' : ''; x.style.cssText = 'flex:1' + (on ? `;background:${opt[i][2]};color:#fff` : ''); });
  opt.forEach(([k, l]) => seg.append(el('button', { type: 'button', onclick: () => { atual = k; pinta(); aoMudar(k); } }, l)));
  pinta(); return seg;
};

export const busca = (placeholder, valor, aoMudar) => el('div', { style: 'position:relative;flex:1;min-width:200px;max-width:320px' },
  el('input', { placeholder, value: valor || '', style: 'padding-left:38px', oninput: e => aoMudar(e.target.value) }),
  el('span', { style: 'position:absolute;left:11px;top:50%;transform:translateY(-50%);color:var(--muted)' }, icon('search', 'ico sm')));
export const contem = (q, ...textos) => !q.trim() || textos.join(' ').toLowerCase().includes(q.trim().toLowerCase());

// ---------- etiquetas ----------
export const etiqueta = (texto, fundo, frente, extra = '') => el('span', { class: 'chiptag', style: `background:${fundo};color:${frente};${extra}` }, texto);
export const etiquetaRepeticao = (r, extra) => (r.assinatura ? el('span', { class: 'chiptag tag-ass', style: extra }, '▶ Assinatura') : r.recorrente ? el('span', { class: 'chiptag tag-rec', style: extra }, '🔁 Recorrente') : null);
export const etiquetaCategoria = r => (pendente(r) ? etiqueta('Pendente', 'var(--amber-weak)', 'var(--amber)') : etiqueta(r.categoria, cor(r.categoria) + '1f', cor(r.categoria)));
export const etiquetaTipo = r => (ehCredito(r) ? etiqueta('Crédito', 'var(--green-weak)', 'var(--green)') : etiqueta('Débito', 'var(--red-weak)', 'var(--red)'));
export const valorAssinado = (r, sinal = '− ') => el('td', { class: 'amt', style: `color:${ehCredito(r) ? 'var(--green)' : 'var(--red)'}` }, (ehCredito(r) ? '+ ' : sinal) + brl(valor(r)));
export const barra = (pct, fundo) => el('div', { class: 'bar' }, el('span', { style: `width:${Math.max(0, Math.min(100, pct))}%;background:${fundo}` }));
export const ponto = k => el('span', { class: 'dot', style: `background:${cor(k)}` });

// ---------- tabelas ordenáveis ----------
const CHAVES = {
  descricao: r => (r.descricao || '').toLowerCase(), categoria: r => (r.categoria || '').toLowerCase(),
  forma_pagamento: r => (r.forma_pagamento || '').toLowerCase(), parcela: r => (r.parcelas_total > 1 ? (r.parcela_num || 0) / r.parcelas_total : -1),
  data_pagamento: r => r.data_pagamento || '', data_transacao: r => r.data_transacao || '', valor: r => valor(r),
};
/** Ordena por `ordem.key` (chaves de lançamento ou `extras`), mantendo a ordem original nos empates. */
export const ordenar = (lista, ordem, extras = {}) => {
  const f = extras[ordem.key] || CHAVES[ordem.key]; if (!f) return lista;
  const d = ordem.dir === 'asc' ? 1 : -1;
  return lista.map((x, i) => [x, i]).sort(([a, i], [b, j]) => { const x = f(a), y = f(b); return x < y ? -d : x > y ? d : i - j; }).map(([x]) => x);
};
const alternar = (ordem, k) => { if (ordem.key === k) ordem.dir = ordem.dir === 'asc' ? 'desc' : 'asc'; else { ordem.key = k; ordem.dir = k === 'valor' ? 'desc' : 'asc'; } };
/** Cabeçalho clicável: colunas [chave, rótulo, classe]; chave nula = coluna sem ordenação. */
export const cabecalho = (cols, ordem, aoOrdenar) => el('thead', {}, el('tr', {}, ...cols.map(([k, lb, cls]) => !k ? el('th', { class: cls || '' }, lb)
  : el('th', { class: 'sort' + (cls ? ' ' + cls : ''), title: 'Ordenar', onclick: () => { alternar(ordem, k); aoOrdenar(); } },
    lb, el('span', { class: 'arr' }, ordem.key === k ? (ordem.dir === 'asc' ? '▲' : '▼') : '')))));
export const linhaVazia = (cols, texto, pad = 24) => el('tr', {}, el('td', { colspan: cols, class: 'muted', style: `text-align:center;padding:${pad}px` }, texto));
