// Importação de fatura/extrato: escolha do arquivo e revisão linha a linha antes de gravar.
import * as C from '../dominio/competencia.js?v=__BUILD__';
import { lerArquivo, competenciaDoNome, classificar } from '../dominio/importacao.js?v=__BUILD__';
import { ehCredito } from '../dominio/lancamento.js?v=__BUILD__';
import { estado, forma, ultimaCompetencia } from '../estado.js?v=__BUILD__';
import * as dados from '../dados.js?v=__BUILD__';
import * as op from '../operacoes.js?v=__BUILD__';
import { el, brl, toast, modal, navMes, selecao, segmentado, ordenar, cabecalho, linhaVazia, etiqueta, valorAssinado, ocupado } from '../ui.js?v=__BUILD__';

const base64 = arq => new Promise((res, rej) => { const fr = new FileReader(); fr.onload = () => res(fr.result.split(',')[1]); fr.onerror = rej; fr.readAsDataURL(arq); });

/** Linhas do arquivo: CSV/OFX lidos aqui; PDF lido pela IA na Edge Function. */
const lerLinhas = async (arq, cartao, comp, status) => {
  if (!/\.pdf$/i.test(arq.name)) return lerArquivo(await arq.text(), arq.name);
  status('Lendo o PDF com IA (pode levar ~20s)...');
  const { compras } = await dados.invocar('importar-fatura', { pdfBase64: await base64(arq), cartao, competencia: comp });
  return (compras || []).map(c => ({ data: c.data, descricao: c.descricao, valor: Math.abs(+c.valor), parcela_atual: c.parcela_atual, parcela_total: c.parcela_total }));
};

export function importarFatura() {
  const cartoes = estado.formas.filter(f => f.tipo === 'CARTAO' || f.tipo === 'CONTA');
  if (!cartoes.length) return toast('Cadastre um cartão primeiro.');
  modal(fechar => {
    let cartao = cartoes[0].nome, comp = ultimaCompetencia();
    const status = el('div', { class: 'muted', style: 'margin-top:10px;font-size:13px' });
    const fld = el('div', { class: 'fld' }, el('label', {}, 'Competência (mês da fatura)'));
    const poeNav = () => fld.replaceChildren(fld.firstChild, navMes(comp, c => { comp = c; }));
    poeNav();
    const arquivo = el('input', { type: 'file', accept: '.csv,.ofx,.txt,application/pdf,text/csv', onchange: () => {
      const c = competenciaDoNome(arquivo.files[0]?.name);
      if (c) { comp = c; poeNav(); status.textContent = 'Competência detectada pelo nome do arquivo: ' + C.rotulo(comp); } } });
    const ler = async ev => {
      const arq = arquivo.files[0], b = ev.currentTarget; if (!arq) return toast('Selecione o arquivo.');
      b.disabled = true; status.style.color = ''; status.textContent = 'Lendo o arquivo...';
      try {
        const linhas = await lerLinhas(arq, cartao, comp, t => { status.textContent = t; });
        if (!linhas.length) throw new Error('Não encontrei lançamentos nesse arquivo.');
        fechar(); revisar(linhas, cartao, comp);
      } catch (e) { status.style.color = 'var(--red)'; status.textContent = e.message || String(e); b.disabled = false; }
    };
    return el('div', {}, el('div', { class: 'muted', style: 'font-size:13px;margin:4px 0 4px' }, 'Aceita CSV ou OFX (exportados do app do banco) e PDF (lido por IA). Nada é gravado antes da sua revisão.'),
      el('div', { class: 'fgrid' }, el('div', { class: 'fld' }, el('label', {}, 'Cartão / conta'), selecao(cartoes.map(f => [f.nome]), cartao, v => { cartao = v; })), fld,
        el('div', { class: 'fld full' }, el('label', {}, 'Arquivo'), arquivo)),
      el('button', { class: 'btn', style: 'width:100%;margin-top:14px', onclick: ler }, 'Ler e revisar'), status);
  }, { titulo: 'Importar fatura / extrato' });
}

const SITUACAO = { proj: ['Confirma projeção', 'var(--primary-weak)', 'var(--primary)'], novo: ['Novo', 'var(--green-weak)', 'var(--green)'], dup: ['Já lançado', 'var(--surface-2)', 'var(--muted)'], cred: ['Crédito/estorno', 'var(--amber-weak)', 'var(--amber)'] };
const ORDEM = { data: x => x.data || '', descricao: x => x.descricao.toLowerCase(), categoria: x => (x.categoria || '~').toLowerCase(), valor: x => (ehCredito(x) ? -x.valor : x.valor) };
const mini = 'padding:2px 8px;font-size:11px';

function revisar(linhas, cartao, comp) {
  const L = classificar(linhas, estado.rows, cartao, comp);
  const qtd = s => L.filter(x => x.situacao === s).length;
  modal(fechar => {
    const box = el('div');
    let filtro = 'todos';
    const visiveis = () => L.filter(x => filtro === 'todos' || x.situacao === filtro);
    const ordem = { key: 'data', dir: 'desc' };
    const emLote = selecao(estado.cats.map(c => [c.nome]), '', v => { if (!v) return; L.forEach(x => { if (x.sel) x.categoria = v; }); emLote.value = ''; desenha(); }, { vazio: 'Aplicar categoria aos marcados…', style: 'width:auto;min-width:200px' });
    const ordemSel = selecao([['data:desc', 'Data (recentes)'], ['data:asc', 'Data (antigas)'], ['valor:desc', 'Maior valor'], ['valor:asc', 'Menor valor'], ['descricao:asc', 'Descrição A–Z'], ['categoria:asc', 'Categoria A–Z']],
      'data:desc', v => { [ordem.key, ordem.dir] = v.split(':'); desenha(); }, { class: 'msort', style: 'width:auto' });
    box.append(segmentado([['todos', `Todos (${L.length})`], ['novo', `Novos (${qtd('novo')})`], ['proj', `Confirma projeção (${qtd('proj')})`], ['dup', `Já lançados (${qtd('dup')})`], ['cred', `Créditos/estornos (${qtd('cred')})`]],
      filtro, k => { filtro = k; desenha(); }, { style: 'margin-top:10px;flex-wrap:wrap' }),
    el('div', { style: 'display:flex;gap:10px;align-items:center;margin-top:10px;flex-wrap:wrap' }, emLote, ordemSel, el('span', { class: 'muted', style: 'font-size:12px' }, 'Categoria sugerida pelo histórico; você pode trocar em cada linha.')));
    const wrap = el('div', { class: 'tablewrap revlist' }), resumo = el('div', { class: 'muted', style: 'font-size:13px;flex:1;align-self:center' });
    const importar = el('button', { class: 'btn', onclick: () => ocupado(importar, async () => {
      const sel = L.filter(x => x.sel), n = await op.importar(sel, forma(cartao), comp);
      fechar(); toast(`✅ ${sel.length} item(ns) importado(s)` + (n > sel.length ? ` (${n} lançamentos com parcelas futuras)` : '') + '.');
    }, 'Importando...') }, 'Importar selecionados');
    box.append(wrap, el('div', { class: 'mfoot' }, resumo, el('button', { class: 'btn ghost', onclick: fechar }, 'Cancelar'), importar));

    const atualiza = () => { const s = L.filter(x => x.sel), semCat = s.filter(x => !x.categoria).length;
      resumo.textContent = `${s.length} selecionado(s) · ${brl(s.reduce((a, x) => a + (ehCredito(x) ? -x.valor : x.valor), 0))}` + (semCat ? ` · ${semCat} sem categoria` : '');
      importar.disabled = !s.length; };
    function desenha() {
      const vis = visiveis();
      const todos = el('input', { type: 'checkbox', style: 'width:auto', ...(vis.length && vis.every(x => x.sel) ? { checked: 1 } : {}), onchange: e => { vis.forEach(x => { x.sel = e.target.checked; }); desenha(); } });
      const th = cabecalho([['data', 'Data'], ['descricao', 'Descrição'], ['categoria', 'Categoria'], ['valor', 'Valor', 'amt']], ordem, () => { ordemSel.value = ordem.key + ':' + ordem.dir; desenha(); });
      th.firstChild.prepend(el('th', {}, todos));
      const tb = el('tbody');
      ordenar(vis, ordem, ORDEM).forEach(x => { const [tg, bg, fg] = SITUACAO[x.situacao];
        tb.append(el('tr', { style: 'cursor:default' + (x.sel ? '' : ';opacity:.6') },
          el('td', {}, el('input', { type: 'checkbox', style: 'width:auto', ...(x.sel ? { checked: 1 } : {}), onchange: e => { x.sel = e.target.checked; desenha(); } })),
          el('td', { class: 'muted', style: 'white-space:nowrap' }, C.fmtData(x.data) || '—'),
          el('td', {}, el('div', { style: 'font-weight:600' }, x.descricao, el('span', { class: 'mdate muted' }, x.data ? ' · ' + C.fmtData(x.data).slice(0, 5) : '')),
            el('div', { style: 'display:flex;gap:6px;flex-wrap:wrap;margin-top:3px' }, etiqueta(tg, bg, fg, mini),
              x.parcela_total > 1 ? etiqueta(`Parcela ${x.parcela_atual}/${x.parcela_total}`, 'var(--primary-weak)', 'var(--primary)', mini) : null,
              ehCredito(x) ? null : el('button', { type: 'button', class: 'chiptag tag-ass' + (x.assinatura ? '' : ' off'), style: 'margin:0;border:none;cursor:pointer', title: 'Marcar/desmarcar como assinatura recorrente', onclick: () => { x.assinatura = !x.assinatura; desenha(); } }, x.assinatura ? '▶ Assinatura' : '＋ Assinatura'),
              x.dup ? el('span', { class: 'muted', style: 'font-size:11px' }, `igual a "${x.dup.descricao}" de ${C.fmtData(x.dup.data_transacao || x.dup.data_pagamento)}`) : null)),
          el('td', {}, selecao(estado.cats.map(c => [c.nome]), x.categoria, v => { x.categoria = v; atualiza(); }, { vazio: '— pendente —', style: 'min-width:150px;padding:6px 8px' })),
          valorAssinado(x)));
      });
      if (!vis.length) tb.append(linhaVazia(5, 'Nada aqui.', 20));
      const t = el('table'); t.append(th, tb); wrap.replaceChildren(t); atualiza();
    }
    desenha(); return box;
  }, { titulo: 'Revisar importação', sub: `${cartao} · ${C.rotulo(comp)} · ${L.length} linha(s) lidas`, largura: 'wide' });
}
