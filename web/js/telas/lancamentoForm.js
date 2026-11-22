// Formulário de lançamento (novo ou edição), com escolha de escopo para recorrentes e exclusão de parcelas.
import * as C from '../dominio/competencia.js?v=__BUILD__';
import * as R from '../dominio/recorrencia.js?v=__BUILD__';
import { lerValor, repeticao, comRepeticao, vencimento } from '../dominio/lancamento.js?v=__BUILD__';
import { estado, forma, ultimaCompetencia } from '../estado.js?v=__BUILD__';
import * as op from '../operacoes.js?v=__BUILD__';
import { el, icon, brl, toast, modal, escolher, campo, navMes, selecao, seletorTipo, ocupado } from '../ui.js?v=__BUILD__';

const OBRIGATORIOS = ['Descrição', 'Valor (R$)', 'Data da compra', 'Categoria', 'Cartão / conta', 'Competência', 'Vencimento'];

/** Pergunta se a mudança vale só para este lançamento recorrente ou também para os seguintes. */
const escopoRecorrente = (r, excluir) => {
  const n = R.seguintes(estado.rows, r).length;
  return escolher(excluir ? 'Excluir lançamento recorrente' : 'Alterar lançamento recorrente',
    `“${r.descricao}” se repete todo mês. ${n ? `Há ${n} lançamento(s) dele de ${C.rotulo(C.atual())} em diante.` : 'Não há lançamentos futuros dele.'} Os meses anteriores não são alterados.`,
    [[excluir ? 'Excluir só este' : 'Alterar só este', 'um', 'ghost'],
     [(excluir ? 'Excluir este e os próximos' : 'Alterar este e os próximos') + (n ? ` (${n})` : ''), 'todos', excluir ? 'red' : '']]);
};

const stepper = (get, set, min, max, depois) => {
  const out = el('span', { class: 'stv' }), upd = () => { out.textContent = String(get()); };
  const passo = d => { set(Math.min(max(), Math.max(min, (+get() || min) + d))); upd(); depois(); };
  upd();
  return el('div', { class: 'stepper' }, el('button', { type: 'button', class: 'iconbtn', onclick: () => passo(-1) }, '−'), out, el('button', { type: 'button', class: 'iconbtn', onclick: () => passo(1) }, '+'));
};

export function abrirLancamento(r = {}) {
  const novo = !r.id;
  const f = { tipo: r.tipo || 'DÉBITO', valor: r.valor != null ? String(r.valor) : '', descricao: r.descricao || '', categoria: r.categoria || '', forma_pagamento: r.forma_pagamento || '',
    competencia: novo ? ultimaCompetencia() : r.competencia, parcelas_total: r.parcelas_total || 1, parcela_num: r.parcela_num ?? '',
    data_pagamento: r.data_pagamento || '', data_transacao: r.data_transacao || (novo ? C.hoje() : ''), ...comRepeticao(repeticao(r)) };
  if (!C.valida(f.competencia)) f.competencia = estado.comp;

  modal(fechar => {
    const box = el('div'), grid = el('div', { class: 'fgrid' });
    box.append(seletorTipo(f.tipo, t => { f.tipo = t; }), grid);

    const pinfo = el('div', { class: 'hint' });
    const info = () => { const t = +f.parcelas_total || 1, v = Math.abs(lerValor(f.valor) || 0);
      pinfo.textContent = t > 1 ? (novo ? `${t}x de ${brl(v)} · uma parcela por mês a partir de ${C.rotulo(f.competencia)}` : `Parcela ${f.parcela_num || '?'} de ${t}`) : 'À vista'; };

    grid.append(campo('Descrição', el('input', { value: f.descricao, oninput: e => { f.descricao = e.target.value; }, placeholder: 'Ex: Mercado' }), 'full'),
      campo('Valor (R$)', el('input', { type: 'number', inputmode: 'decimal', step: '0.01', value: f.valor, placeholder: '0,00', oninput: e => { f.valor = e.target.value; info(); } })),
      campo('Data da compra', el('input', { type: 'date', value: f.data_transacao, onchange: e => { f.data_transacao = e.target.value; } })),
      campo('Categoria', selecao(estado.cats.map(c => [c.nome]), f.categoria, v => { f.categoria = v; }, { vazio: '— sem categoria —' })),
      campo('Cartão / conta', selecao(estado.formas.map(x => [x.nome]), f.forma_pagamento, v => { f.forma_pagamento = v; manual = false; autoVenc(); }, { vazio: '— escolha —' })));

    // vencimento: automático pelo dia do cartão/conta na competência, até ser definido à mão
    const vHint = el('div', { class: 'hint' });
    let manual = !!f.data_pagamento && !novo;
    const venc = el('input', { type: 'date', value: f.data_pagamento, onchange: e => { f.data_pagamento = e.target.value; manual = true; vHint.textContent = 'Definido manualmente'; } });
    const autoVenc = () => {
      if (manual) return;
      const fo = forma(f.forma_pagamento), v = vencimento(fo, f.competencia);
      if (v) { f.data_pagamento = v; venc.value = v; vHint.textContent = `Automático: dia ${fo.dia_vencimento} do ${fo.nome}`; }
      else vHint.textContent = f.forma_pagamento ? 'Esse cartão/conta não tem dia de vencimento cadastrado (Ajustes)' : 'Escolha o cartão/conta para preencher';
    };
    grid.append(campo('Competência', navMes(f.competencia, c => { f.competencia = c; manual = false; autoVenc(); info(); })), campo('Vencimento', el('div', {}, venc, vHint)));
    autoVenc();

    // repetição: nenhuma, recorrente ou assinatura (exclusivas; repetir todo mês não combina com parcelas)
    const camposParcela = [];
    const tgl = (lab, k, dica) => { const b = el('button', { type: 'button', class: 'tgl', title: dica, onclick: () => { Object.assign(f, comRepeticao(repeticao(f) === k ? '' : k)); if (f.recorrente) setParcelas(1); pinta(); } }, lab); b.dataset.k = k; return b; };
    const tgls = [tgl('🔁 Recorrente', 'recorrente', 'Repete todo mês'), tgl('▶ Assinatura', 'assinatura', 'Serviço por assinatura (streaming, apps, seguros…)')];
    const pinta = () => { tgls.forEach(b => b.classList.toggle('on', repeticao(f) === b.dataset.k)); camposParcela.forEach(x => x.classList.toggle('hidden', f.recorrente)); };
    grid.append(el('div', { class: 'full tgls' }, ...tgls));

    let setParcelas = n => { f.parcelas_total = n; };
    if (!novo) {
      camposParcela.push(campo('Parcela nº', stepper(() => +f.parcela_num || 1, v => { f.parcela_num = v; }, 1, () => +f.parcelas_total || 1, info)),
        campo('Total de parcelas', stepper(() => +f.parcelas_total || 1, v => { f.parcelas_total = v; }, 1, () => 120, info)));
    } else {
      const outN = el('span', { class: 'stv' }), chips = el('div', { class: 'pchips' });
      const marcar = () => { [...chips.querySelectorAll('[data-n]')].forEach(b => b.classList.toggle('on', +b.dataset.n === (+f.parcelas_total || 1))); outN.textContent = (+f.parcelas_total || 1) + 'x'; };
      setParcelas = n => { f.parcelas_total = Math.min(120, Math.max(1, n)); marcar(); info(); };
      [1, 2, 3, 6, 10, 12].forEach(n => chips.append(el('button', { type: 'button', 'data-n': n, onclick: () => setParcelas(n) }, n === 1 ? 'À vista' : n + 'x')));
      chips.append(el('span', { class: 'stepper sm' }, el('button', { type: 'button', class: 'iconbtn', onclick: () => setParcelas((+f.parcelas_total || 1) - 1) }, '−'), outN,
        el('button', { type: 'button', class: 'iconbtn', onclick: () => setParcelas((+f.parcelas_total || 1) + 1) }, '+')));
      camposParcela.push(campo('Parcelas', el('div', {}, chips), 'full'));
      marcar();
    }
    grid.append(...camposParcela, el('div', { class: 'full' }, pinfo));
    info(); pinta();
    grid.querySelectorAll('.fld').forEach(x => x.classList.toggle('req', OBRIGATORIOS.includes(x.dataset.lab)));
    const limpaErro = e => e.target.closest('.fld')?.classList.remove('erro');
    grid.addEventListener('change', limpaErro); grid.addEventListener('input', limpaErro);

    const salvar = async ev => {
      const botao = ev.currentTarget, v = Math.abs(lerValor(f.valor) || 0);
      const faltam = [['Descrição', !!f.descricao.trim()], ['Valor (R$)', v > 0], ['Competência', C.valida(f.competencia)], ['Data da compra', C.dataValida(f.data_transacao)],
        ['Categoria', !!f.categoria], ['Cartão / conta', !!f.forma_pagamento], ['Vencimento', C.dataValida(f.data_pagamento)]].filter(([, ok]) => !ok).map(([n]) => n);
      grid.querySelectorAll('.fld').forEach(x => x.classList.toggle('erro', faltam.includes(x.dataset.lab)));
      if (faltam.length) return toast('Preencha: ' + faltam.join(', ') + '.');
      const escopo = !novo && r.recorrente ? await escopoRecorrente(r) : 'um';
      if (!escopo) return;
      await ocupado(botao, async () => { const msg = await op.salvarLancamento({ ...f, valor: v }, r, escopo); fechar(); if (msg) toast(msg); });
    };
    const excluir = async ev => {
      const botao = ev.currentTarget, escopo = r.recorrente ? await escopoRecorrente(r, true) : confirm('Excluir?') && 'um';
      if (!escopo) return;
      await ocupado(botao, async () => { await op.excluirLancamento(r, escopo); fechar(); });
    };
    if (!novo && r.grupo && r.parcelas_total > 1)
      box.append(el('button', { class: 'btn ghost', style: 'width:100%;margin-top:10px', onclick: async ev => {
        if (!confirm(`Apagar esta parcela (${r.parcela_num || '?'}/${r.parcelas_total}) e todas as próximas?`)) return;
        await ocupado(ev.currentTarget, async () => { const n = await op.excluirLancamento(r, 'parcelas'); toast(`${n} parcela(s) removida(s).`); fechar(); });
      } }, icon('trash', 'ico sm'), 'Apagar esta e as próximas parcelas'));
    box.append(el('div', { class: 'mfoot' }, el('button', { class: 'btn ghost', onclick: fechar }, 'Cancelar'), el('button', { class: 'btn', style: 'flex:1', onclick: salvar }, 'Salvar'),
      novo ? null : el('button', { class: 'btn red', onclick: excluir }, icon('trash', 'ico sm'))));
    return box;
  }, { titulo: novo ? 'Novo lançamento' : 'Editar lançamento', largura: 'lanc' });
}
