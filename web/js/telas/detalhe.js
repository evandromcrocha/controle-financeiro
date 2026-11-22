// Janelas de detalhe: lançamentos de um recorte e saldo mês a mês.
import * as C from '../dominio/competencia.js?v=__BUILD__';
import { entradasSaidas, totaisDoMes, saldosFinais } from '../dominio/agregados.js?v=__BUILD__';
import { parcelado } from '../dominio/lancamento.js?v=__BUILD__';
import { estado, doMes } from '../estado.js?v=__BUILD__';
import * as op from '../operacoes.js?v=__BUILD__';
import { el, brl, modal, ordenar, cabecalho, linhaVazia, etiquetaCategoria, valorAssinado, corSinal, ocupado } from '../ui.js?v=__BUILD__';
import { abrirLancamento } from './lancamentoForm.js?v=__BUILD__';

export function abrirDetalhe(titulo, lista) {
  const { e, s } = entradasSaidas(lista);
  const resumo = [`${lista.length} lançamento(s)`, e && 'entradas ' + brl(e), s && 'saídas ' + brl(s), e && s && 'resultado ' + brl(e - s)].filter(Boolean).join(' · ');
  modal(fechar => {
    const ordem = { key: 'data_transacao', dir: 'asc' }, wrap = el('div', { class: 'tablewrap', style: 'margin-top:14px' });
    const desenha = () => {
      const tb = el('tbody');
      ordenar(lista, ordem).forEach(r => tb.append(el('tr', { onclick: () => { fechar(); abrirLancamento(r); } },
        el('td', { class: 'muted', style: 'white-space:nowrap' }, C.fmtData(r.data_transacao)),
        el('td', { style: 'font-weight:600' }, r.descricao),
        el('td', {}, etiquetaCategoria(r)),
        el('td', { class: 'muted' }, parcelado(r) ? `${r.parcela_num || '?'}/${r.parcelas_total}` : '—'),
        valorAssinado(r))));
      if (!lista.length) tb.append(linhaVazia(5, 'Nenhum lançamento.'));
      wrap.replaceChildren(el('table', {}, cabecalho([['data_transacao', 'Data da compra'], ['descricao', 'Descrição'], ['categoria', 'Categoria'], ['parcela', 'Parcela'], ['valor', 'Valor', 'amt']], ordem, desenha), tb));
    };
    desenha(); return wrap;
  }, { titulo, sub: resumo, largura: 'wide' });
}

/** Linhas Mês | Entradas | Saídas | Resultado | Saldo final de uma lista de competências. */
export const linhasDeSaldo = (comps, aoClicar) => {
  const finais = saldosFinais(estado.meses, estado.saldoIni);
  return comps.map(c => { const { e, s } = totaisDoMes(estado.meses, c), fim = finais.get(c) ?? 0;
    return el('tr', { title: 'Ver lançamentos do mês', onclick: () => aoClicar(c) },
      el('td', { style: 'font-weight:500' }, C.rotulo(c)), el('td', { class: 'amt', style: 'color:var(--green)' }, brl(e)), el('td', { class: 'amt', style: 'color:var(--red)' }, brl(s)),
      el('td', { class: 'amt', style: `color:${corSinal(e - s)}` }, brl(e - s)), el('td', { class: 'amt', style: `color:${fim >= 0 ? 'var(--text)' : 'var(--red)'}` }, brl(fim))); });
};
export const cabecalhoSaldo = fim => el('thead', {}, el('tr', {}, el('th', {}, 'Mês'), el('th', { class: 'amt' }, 'Entradas'), el('th', { class: 'amt' }, 'Saídas'), el('th', { class: 'amt' }, 'Resultado'), el('th', { class: 'amt' }, fim)));

export function abrirSaldo() {
  modal(fechar => {
    const box = el('div'), si = el('input', { type: 'number', step: '0.01', value: estado.saldoIni || 0, style: 'width:180px' });
    box.append(el('div', { style: 'display:flex;gap:10px;align-items:flex-end;margin-top:12px;flex-wrap:wrap' },
      el('div', {}, el('label', { style: 'margin-top:0' }, 'Saldo inicial (antes do 1º mês)'), si),
      el('button', { class: 'btn sm', onclick: ev => ocupado(ev.currentTarget, async () => { await op.salvarSaldoInicial(+si.value || 0); fechar(); abrirSaldo(); }) }, 'Salvar')));
    const comps = estado.comps.filter(c => C.compara(c, estado.comp) <= 0).sort((a, b) => C.compara(b, a));
    box.append(el('div', { class: 'tablewrap', style: 'margin-top:14px' }, el('table', {}, cabecalhoSaldo('Saldo no fim'),
      el('tbody', {}, linhasDeSaldo(comps, c => { fechar(); abrirDetalhe('Lançamentos · ' + C.rotulo(c), doMes(c)); })))));
    return box;
  }, { titulo: 'Saldo no fim de cada mês', sub: 'Saldo inicial + entradas − saídas, mês a mês, até ' + C.rotulo(estado.comp), largura: 'wide' });
}
