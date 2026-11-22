// Tela Projeções: meses futuros das recorrências — gerar, alterar ou apagar.
import * as C from '../dominio/competencia.js?v=__BUILD__';
import * as R from '../dominio/recorrencia.js?v=__BUILD__';
import { entradasSaidas } from '../dominio/agregados.js?v=__BUILD__';
import { ehCredito, lerValor, repeticao, comRepeticao } from '../dominio/lancamento.js?v=__BUILD__';
import { estado, forma, pref } from '../estado.js?v=__BUILD__';
import * as op from '../operacoes.js?v=__BUILD__';
import { el, brl, corSinal, toast, modal, campo, navMes, selecao, seletorTipo, segmentado, busca, contem, ordenar, cabecalho, linhaVazia, etiquetaTipo, etiquetaRepeticao, ocupado } from '../ui.js?v=__BUILD__';

const FILTROS = { todos: () => true, 'DÉBITO': g => !ehCredito(g.modelo), 'CRÉDITO': g => ehCredito(g.modelo), ASS: g => g.modelo.assinatura, REC: g => !g.modelo.assinatura };
const ORDEM = { descricao: g => (g.modelo.descricao || '').toLowerCase(), tipo: g => g.modelo.tipo, forma_pagamento: g => (g.modelo.forma_pagamento || '').toLowerCase(), periodo: g => C.ordem(g.primeira), qtd: g => g.qtd, valor: g => g.valor };
const tela = { filtro: 'todos', q: '', ordem: { key: 'descricao', dir: 'asc' } };

function editar(g, apagar) {
  const m = g.modelo;
  let desde = g.primeira;
  const f = { tipo: m.tipo, descricao: m.descricao, valor: String(g.valor), categoria: m.categoria || '', forma_pagamento: m.forma_pagamento || '', ...comRepeticao(m.assinatura ? 'assinatura' : 'recorrente'),
    dia: m.data_pagamento ? C.dia(m.data_pagamento) : (forma(m.forma_pagamento)?.dia_vencimento || '') };
  const alvo = () => R.daRecorrencia(estado.rows, m, desde, { soProjecoes: true });
  modal(fechar => {
    const box = el('div'), resumo = el('div', { class: 'muted', style: 'font-size:13px' }), grid = el('div', { class: 'fgrid' });
    const upd = () => { resumo.textContent = `${alvo().length} projeção(ões) de ${C.rotulo(desde)} a ${C.rotulo(g.ultima)}. Lançamentos reais não são afetados.`; };
    box.append(resumo);
    grid.append(campo('A partir de', navMes(desde, c => { desde = c; upd(); }, [g.primeira, g.ultima])));
    if (!apagar) {
      const dia = el('input', { type: 'number', min: 1, max: 31, value: f.dia, oninput: e => { f.dia = e.target.value; } });
      const rep = el('div', { class: 'full tgls' }), pinta = () => [...rep.children].forEach(b => b.classList.toggle('on', b.dataset.k === repeticao(f)));
      [['recorrente', '🔁 Recorrente'], ['assinatura', '▶ Assinatura']].forEach(([k, t]) => rep.append(el('button', { type: 'button', class: 'tgl', 'data-k': k, onclick: () => { Object.assign(f, comRepeticao(k)); pinta(); } }, t)));
      pinta();
      box.append(seletorTipo(f.tipo, t => { f.tipo = t; }));
      grid.append(campo('Descrição', el('input', { value: f.descricao, oninput: e => { f.descricao = e.target.value; } }), 'full'),
        campo('Valor (R$)', el('input', { type: 'number', step: '0.01', inputmode: 'decimal', value: f.valor, oninput: e => { f.valor = e.target.value; } })),
        campo('Categoria', selecao(estado.cats.map(c => [c.nome]), f.categoria, v => { f.categoria = v; }, { vazio: '— sem categoria —' })),
        campo('Cartão / conta', selecao(estado.formas.map(x => [x.nome]), f.forma_pagamento, v => { f.forma_pagamento = v; const d = forma(v)?.dia_vencimento; if (d) { f.dia = d; dia.value = d; } })),
        campo('Dia de vencimento', dia), rep);
    }
    box.append(grid); upd();
    const ir = el('button', { class: 'btn' + (apagar ? ' red' : ''), style: 'flex:1', onclick: () => {
      if (apagar) return ocupado(ir, async () => { toast(`${await op.apagarProjecoes(m, desde)} projeção(ões) removida(s).`); fechar(); });
      const v = Math.abs(lerValor(f.valor) || 0);
      if (!f.descricao.trim() || !v || !f.forma_pagamento) return toast('Preencha descrição, valor e cartão/conta.');
      const campos = { descricao: f.descricao.trim(), valor: v, tipo: f.tipo, categoria: f.categoria || null, forma_pagamento: f.forma_pagamento, assinatura: f.assinatura };
      ocupado(ir, async () => { toast(`${await op.alterarProjecoes(m, desde, campos, Math.min(31, Math.max(1, +f.dia || 1)))} projeção(ões) atualizada(s).`); fechar(); });
    } }, apagar ? 'Apagar projeções' : 'Salvar');
    box.append(el('div', { class: 'mfoot' }, el('button', { class: 'btn ghost', onclick: fechar }, 'Cancelar'), ir));
    return box;
  }, { titulo: (apagar ? 'Apagar projeções · ' : 'Alterar projeções · ') + m.descricao, largura: apagar ? '' : 'lanc' });
}

export function render(v) {
  const ate = el('input', { id: 'projAte', value: pref.ler('projate', '12/2027'), placeholder: 'MM/AAAA', style: 'width:150px' });
  const gerar = el('button', { class: 'btn', onclick: () => {
    const c = ate.value.trim(); if (!C.valida(c)) return toast('Informe o mês no formato MM/AAAA.');
    ocupado(gerar, async () => toast(`${await op.gerarProjecoes(c)} projeção(ões) criada(s) até ${c}.`), 'Gerando...');
  } }, 'Gerar projeções');
  v.append(el('div', { class: 'card' }, el('h2', { style: 'margin-top:0' }, 'O que são projeções'),
    el('div', { class: 'muted', style: 'margin-bottom:14px' }, 'Meses futuros dos seus lançamentos recorrentes (assinaturas, seguros, salário). Compras parceladas não aparecem aqui: elas já são criadas em todos os meses no momento do lançamento. Gerar, alterar ou apagar projeções não afeta os lançamentos reais.'),
    el('div', { style: 'display:flex;gap:10px;flex-wrap:wrap;align-items:flex-end' }, el('div', {}, el('label', { style: 'margin-top:0' }, 'Projetar recorrentes até'), ate), gerar,
      el('button', { class: 'btn ghost', onclick: ev => confirm('Apagar TODAS as projeções? Os lançamentos reais não são afetados.') && ocupado(ev.currentTarget, async () => toast(`${await op.apagarProjecoes()} projeção(ões) removida(s).`)) }, 'Apagar todas'))));

  const proj = estado.rows.filter(r => r.projetado), itens = R.itensProjetados(estado.rows), { e, s } = entradasSaidas(proj);
  const stat = (lb, val, c) => el('div', { class: 'card stat' }, el('div', { class: 'lbl' }, lb), el('div', { class: 'val', style: c ? `color:${c}` : '' }, val));
  v.append(el('div', { class: 'row', style: 'margin-top:16px' }, stat('Projeções ativas', String(proj.length)), stat('Créditos projetados', brl(e), 'var(--green)'),
    stat('Débitos projetados', brl(s), 'var(--red)'), stat('Saldo projetado', brl(e - s), corSinal(e - s))));

  const box = el('div', { class: 'card', style: 'padding:6px' });
  v.append(el('h2', {}, 'Projeções por item'), el('div', { style: 'display:flex;gap:12px;align-items:center;margin-bottom:14px;flex-wrap:wrap' },
    busca('Buscar projeção...', tela.q, q => { tela.q = q; desenha(); }),
    segmentado([['todos', 'Todos'], ['DÉBITO', 'Débitos'], ['CRÉDITO', 'Créditos'], ['ASS', 'Assinaturas'], ['REC', 'Recorrentes']], tela.filtro, k => { tela.filtro = k; desenha(); })), box);
  function desenha() {
    const lista = ordenar(itens.filter(g => FILTROS[tela.filtro](g) && contem(tela.q, g.modelo.descricao, g.modelo.forma_pagamento, g.modelo.categoria)), tela.ordem, ORDEM);
    const tb = el('tbody');
    if (!lista.length) tb.append(linhaVazia(7, itens.length ? 'Nenhuma projeção encontrada para esse filtro.' : 'Nenhuma projeção. Use "Gerar projeções" acima.', 30));
    lista.forEach(g => { const m = g.modelo;
      tb.append(el('tr', {}, el('td', {}, el('b', {}, m.descricao), el('div', {}, etiquetaRepeticao(m))), el('td', {}, etiquetaTipo(m)),
        el('td', { class: 'muted' }, m.forma_pagamento || '—'), el('td', { class: 'muted', style: 'white-space:nowrap' }, `${g.primeira} → ${g.ultima}`), el('td', {}, String(g.qtd)),
        el('td', { class: 'amt', style: `color:${ehCredito(m) ? 'var(--green)' : 'var(--red)'}` }, brl(g.valor)),
        el('td', {}, el('div', { style: 'display:flex;gap:6px' }, el('button', { class: 'btn ghost sm', onclick: () => editar(g, false) }, 'Alterar'), el('button', { class: 'btn ghost sm', onclick: () => editar(g, true) }, 'Apagar')))));
    });
    box.replaceChildren(el('div', { class: 'tablewrap' }, el('table', {}, cabecalho([['descricao', 'Item'], ['tipo', 'Tipo'], ['forma_pagamento', 'Cartão/Conta'], ['periodo', 'Período'], ['qtd', 'Qtd'], ['valor', 'Valor', 'amt'], [null, 'Ações']], tela.ordem, desenha), tb)));
  }
  desenha();
}
