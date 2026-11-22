// Tela Lançamentos: lista do mês com busca, filtros e categoria editável na própria linha.
import * as C from '../dominio/competencia.js?v=__BUILD__';
import { ehCredito, valor, pendente, parcelado } from '../dominio/lancamento.js?v=__BUILD__';
import * as op from '../operacoes.js?v=__BUILD__';
import { estado, doMes } from '../estado.js?v=__BUILD__';
import { el, icon, brl, cor, toast, busca, contem, segmentado, ordenar, cabecalho, linhaVazia, etiqueta, etiquetaRepeticao } from '../ui.js?v=__BUILD__';
import { abrirLancamento } from './lancamentoForm.js?v=__BUILD__';

const FILTROS = { todos: () => true, pendentes: pendente, ass: r => r.assinatura, rec: r => r.recorrente && !r.assinatura };
const VAZIO = { pendentes: 'Nada pendente 🎉', ass: 'Nenhuma assinatura neste mês.' };
const tela = { filtro: 'todos', q: '', ordem: { key: 'data_pagamento', dir: 'asc' } }; // lembrado ao trocar de aba

const seletorCategoria = (r, aoMudar) => {
  const c = pendente(r) ? 'var(--amber)' : cor(r.categoria);
  const s = el('select', { class: 'catsel', title: 'Alterar categoria', style: `background:${pendente(r) ? 'var(--amber-weak)' : c + '1f'};color:${c}`, onclick: e => e.stopPropagation(),
    onchange: async e => { const nova = e.target.value || null; e.target.disabled = true;
      try { await op.categorizar(r, nova); toast(nova ? `“${r.descricao}” → ${nova}` : 'Categoria removida'); aoMudar(); } catch (err) { e.target.disabled = false; toast(err.message); } } });
  s.append(el('option', { value: '' }, 'Pendente'));
  estado.cats.forEach(x => s.append(el('option', { value: x.nome, ...(x.nome === r.categoria ? { selected: 1 } : {}) }, x.nome)));
  return s;
};

export function render(v) {
  const wrap = el('div', { class: 'card', style: 'padding:6px 6px' });
  const seg = segmentado([['todos', 'Todos'], ['pendentes', 'Pendentes', 'amber'], ['ass', 'Assinaturas'], ['rec', 'Recorrentes']], tela.filtro, k => { tela.filtro = k; desenha(); });
  v.append(el('div', { style: 'display:flex;gap:12px;align-items:center;margin-bottom:16px;flex-wrap:wrap' },
    busca('Buscar lançamento...', tela.q, q => { tela.q = q; desenha(); }), seg,
    el('button', { class: 'btn', style: 'margin-left:auto', onclick: () => abrirLancamento() }, icon('plus', 'ico sm'), 'Novo')), wrap);

  function desenha() {
    const mes = doMes(), np = mes.filter(pendente).length;
    seg.children[1].textContent = 'Pendentes' + (np ? ` (${np})` : '');
    const lista = ordenar(mes.filter(r => FILTROS[tela.filtro](r) && contem(tela.q, r.descricao, r.categoria, r.forma_pagamento)), tela.ordem);
    const tb = el('tbody');
    if (!lista.length) tb.append(linhaVazia(6, VAZIO[tela.filtro] || 'Nenhum lançamento.', 34));
    lista.forEach(r => { const p = pendente(r), c = p ? 'var(--amber)' : cor(r.categoria);
      tb.append(el('tr', { onclick: () => abrirLancamento(r) },
        el('td', {}, el('div', { style: 'display:flex;align-items:center;gap:11px' }, el('span', { class: 'avatar', style: `background:${c}1f;color:${c}` }, icon(p ? 'sparkle' : 'tag', 'ico sm')), el('div', {},
          el('div', { style: 'font-weight:600' }, r.descricao),
          parcelado(r) ? etiqueta(`Parcela ${r.parcela_num || '?'}/${r.parcelas_total}`, 'var(--primary-weak)', 'var(--info)', 'margin-top:3px;padding:2px 8px;font-size:11px') : null,
          etiquetaRepeticao(r),
          r.projetado ? etiqueta('Projeção', 'var(--amber-weak)', 'var(--amber)', 'margin-left:5px;padding:2px 8px;font-size:11px') : null))),
        el('td', {}, seletorCategoria(r, desenha)),
        el('td', { class: 'muted' }, r.forma_pagamento || '—'),
        el('td', { class: 'muted', style: 'white-space:nowrap' }, C.fmtData(r.data_transacao)),
        el('td', { class: 'muted', style: 'white-space:nowrap' }, C.fmtData(r.data_pagamento) || '—'),
        el('td', { class: 'amt', style: `color:${ehCredito(r) ? 'var(--green)' : 'var(--red)'}` }, (ehCredito(r) ? '+ ' : '- ') + brl(valor(r)).replace('R$', '').trim())));
    });
    wrap.replaceChildren(el('div', { class: 'tablewrap' }, el('table', {}, cabecalho([['descricao', 'Descrição'], ['categoria', 'Categoria'], ['forma_pagamento', 'Cartão/Conta'], ['data_transacao', 'Compra'], ['data_pagamento', 'Venc.'], ['valor', 'Valor', 'amt']], tela.ordem, desenha), tb)));
  }
  desenha();
}
