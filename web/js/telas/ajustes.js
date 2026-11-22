// Tela Ajustes: importação, auto-categorização, cartões/contas, metas, segurança e categorias.
import { estado } from '../estado.js?v=__BUILD__';
import * as dados from '../dados.js?v=__BUILD__';
import * as op from '../operacoes.js?v=__BUILD__';
import { el, icon, brl, cor, toast, modal, selecao, ocupado, etiqueta, ponto } from '../ui.js?v=__BUILD__';
import { importarFatura } from './importacao.js?v=__BUILD__';
import { alternarTema } from '../tema.js?v=__BUILD__';

const TIPOS = [['CARTAO', 'Cartão'], ['CONTA', 'Conta'], ['DINHEIRO', 'Dinheiro']];
const gravar = (botao, fn, fechar) => ocupado(botao, async () => { await op.cadastro(fn); fechar?.(); });
const rodape = (...b) => el('div', { style: 'display:flex;gap:10px;margin-top:20px' }, ...b);

export function abrirMeta(o = {}) {
  modal(fechar => {
    let categoria = o.categoria || estado.cats[0]?.nome;
    const sel = selecao(estado.cats.map(c => [c.nome]), categoria, v => { categoria = v; }, { disabled: !!o.id });
    const val = el('input', { type: 'number', step: '0.01', min: '0', value: o.valor || '', placeholder: 'Ex.: 800,00' });
    return el('div', {}, el('label', {}, 'Categoria'), sel, el('label', {}, 'Limite por mês (R$)'), val, rodape(
      o.id ? el('button', { class: 'btn red', onclick: ev => gravar(ev.currentTarget, d => d.metas.excluir(o.id), fechar) }, icon('trash', 'ico sm'), 'Excluir') : null,
      el('button', { class: 'btn', style: 'flex:1', onclick: ev => { const v = +val.value; if (!(v > 0)) return toast('Informe um valor.'); gravar(ev.currentTarget, d => d.metas.salvar(categoria, v), fechar); } }, 'Salvar')));
  }, { titulo: o.id ? 'Editar meta' : 'Nova meta de orçamento' });
}

function abrirCartao(r = {}) {
  modal(fechar => {
    const f = { nome: r.nome || '', tipo: r.tipo || 'CARTAO', dia_vencimento: r.dia_vencimento || '' };
    return el('div', {}, el('label', {}, 'Nome'), el('input', { value: f.nome, oninput: e => { f.nome = e.target.value; }, placeholder: 'Ex: Nubank' }),
      el('label', {}, 'Tipo'), selecao(TIPOS, f.tipo, v => { f.tipo = v; }),
      el('label', {}, 'Dia de vencimento (cartão)'), el('input', { type: 'number', value: f.dia_vencimento, oninput: e => { f.dia_vencimento = e.target.value; } }),
      rodape(el('button', { class: 'btn', style: 'flex:1', onclick: ev => { if (!f.nome.trim()) return toast('Informe o nome.');
        gravar(ev.currentTarget, d => d.formas.salvar(r.id, { nome: f.nome.trim(), tipo: f.tipo, dia_vencimento: f.dia_vencimento ? +f.dia_vencimento : null }), fechar); } }, 'Salvar'),
        r.id ? el('button', { class: 'btn red', onclick: ev => confirm('Remover?') && gravar(ev.currentTarget, d => d.formas.excluir(r.id), fechar) }, icon('trash', 'ico sm')) : null));
  }, { titulo: r.id ? 'Editar cartão/conta' : 'Novo cartão/conta' });
}

const REGRAS = [['8+ caracteres', v => v.length >= 8], ['Letra', v => /[A-Za-zÀ-ÿ]/.test(v)], ['Número', v => /\d/.test(v)], ['Símbolo (!@#...)', v => /[^A-Za-zÀ-ÿ0-9\s]/.test(v)]];
function abrirSenha() {
  modal(fechar => {
    const atual = el('input', { type: 'password', autocomplete: 'current-password' }), n1 = el('input', { type: 'password', autocomplete: 'new-password' }), n2 = el('input', { type: 'password', autocomplete: 'new-password' });
    const chk = el('div', { style: 'display:flex;gap:6px;flex-wrap:wrap;margin-top:10px' }), err = el('div', { style: 'color:var(--red);font-size:13px;margin-top:10px' });
    const upd = () => chk.replaceChildren(...REGRAS.map(([t, f]) => { const ok = f(n1.value); return etiqueta((ok ? '✓ ' : '• ') + t, ok ? 'var(--green-weak)' : 'var(--surface-2)', ok ? 'var(--green)' : 'var(--muted)'); }));
    n1.addEventListener('input', upd); upd();
    const salvar = async ev => {
      err.textContent = ''; const v = n1.value;
      if (!REGRAS.every(([, f]) => f(v))) return (err.textContent = 'A nova senha não atende às regras.');
      if (v !== n2.value) return (err.textContent = 'As senhas não conferem.');
      if (v === atual.value) return (err.textContent = 'A nova senha deve ser diferente da atual.');
      const b = ev.currentTarget; b.disabled = true;
      try { await dados.trocarSenha(atual.value, v); fechar(); toast('Senha alterada com sucesso.'); } catch (e) { err.textContent = e.message; } finally { b.disabled = false; }
    };
    return el('div', {}, el('label', {}, 'Senha atual'), atual, el('label', {}, 'Nova senha'), n1, chk, el('label', {}, 'Confirmar nova senha'), n2, err,
      rodape(el('button', { class: 'btn ghost', onclick: fechar }, 'Cancelar'), el('button', { class: 'btn', style: 'flex:1', onclick: salvar }, 'Salvar nova senha')));
  }, { titulo: 'Alterar senha' });
}

const secao = (titulo, botao) => el('div', { style: 'display:flex;justify-content:space-between;align-items:center' }, el('h2', {}, titulo), botao);
const novo = (t, fn) => el('button', { class: 'btn sm', onclick: fn }, icon('plus', 'ico sm'), t);
const acao = (ic, fundo, frente, onclick, ...conteudo) => el('div', { class: 'lrow', style: 'cursor:pointer', onclick }, el('span', { class: 'avatar', style: `background:${fundo};color:${frente}` }, icon(ic, 'ico sm')), ...conteudo);

export function render(v) {
  v.append(el('div', { style: 'display:grid;grid-template-columns:1fr 1fr;gap:12px' },
    el('button', { class: 'import', onclick: importarFatura }, el('span', { class: 'ic-wrap' }, icon('doc')),
      el('span', {}, el('div', { style: 'font-weight:650;font-size:16px' }, 'Importar fatura / extrato'), el('div', { style: 'font-size:13px;opacity:.9' }, 'CSV, OFX ou PDF · você revisa antes de gravar'))),
    el('button', { class: 'btn ghost', style: 'justify-content:flex-start;gap:12px;padding:16px', onclick: ev => ocupado(ev.currentTarget, async () => toast(`${await op.autocategorizar()} lançamento(s) categorizado(s) pelo histórico.`)) },
      icon('sparkle'), el('span', {}, el('div', { style: 'font-weight:700' }, 'Auto-categorizar'), el('div', { class: 'muted', style: 'font-size:13px' }, 'Classifica pendentes pelo histórico')))));

  v.append(secao('Cartões e contas', novo('Novo', () => abrirCartao())), el('div', { class: 'card' }, ...estado.formas.map(f => el('div', { class: 'lrow', style: 'cursor:pointer', onclick: () => abrirCartao(f) },
    el('span', { class: 'avatar', style: `background:${cor(f.nome)}` }, icon('wallet', 'ico sm')),
    el('span', { style: 'flex:1' }, el('div', { style: 'font-weight:600' }, f.nome), el('div', { class: 'muted', style: 'font-size:12px' }, Object.fromEntries(TIPOS)[f.tipo] + (f.dia_vencimento ? ` · vence dia ${f.dia_vencimento}` : ''))),
    icon('gear', 'ico sm')))));

  v.append(secao('Metas de orçamento (por mês)', novo('Nova', () => abrirMeta())), el('div', { class: 'card' },
    ...estado.orc.map(o => el('div', { class: 'lrow', style: 'cursor:pointer', onclick: () => abrirMeta(o) }, ponto(o.categoria), el('span', { style: 'flex:1' }, o.categoria), el('b', {}, brl(+o.valor)), icon('gear', 'ico sm'))),
    estado.orc.length ? null : el('div', { class: 'muted' }, 'Nenhuma meta ainda.')));

  v.append(el('h2', {}, 'Segurança'));
  if (estado.email) v.append(el('div', { class: 'muted', style: 'font-size:13px;margin:-4px 0 10px' }, 'Conectado como ', el('b', { style: 'color:var(--text)' }, estado.email)));
  const prim = ['var(--primary-weak)', 'var(--primary)'];
  v.append(el('div', { class: 'card' },
    acao('gear', ...prim, abrirSenha, el('span', { style: 'flex:1' }, el('div', { style: 'font-weight:600' }, 'Alterar senha'), el('div', { class: 'muted', style: 'font-size:12px' }, 'Mínimo 8 caracteres, com letras, números e símbolos'))),
    acao('moon', ...prim, alternarTema, el('span', { style: 'flex:1;font-weight:600' }, 'Alternar tema claro/escuro')),
    acao('down', 'var(--red-weak)', 'var(--red)', dados.sair, el('span', { style: 'flex:1;font-weight:600;color:var(--red)' }, 'Sair da conta'))));

  const ci = el('input', { placeholder: 'Nova categoria...', style: 'max-width:320px' });
  v.append(el('h2', {}, 'Categorias'), el('div', { style: 'display:flex;gap:10px;margin-bottom:12px' }, ci,
    el('button', { class: 'btn sm', onclick: ev => { const n = ci.value.trim().toUpperCase(); if (n) gravar(ev.currentTarget, d => d.categorias.salvar(null, { nome: n })); } }, 'Adicionar')),
  el('div', { class: 'card' }, ...estado.cats.map(c => el('div', { class: 'lrow' }, ponto(c.nome), el('span', { style: 'flex:1' }, c.nome),
    el('button', { class: 'iconbtn', style: 'width:34px;height:34px', onclick: ev => confirm('Remover ' + c.nome + '?') && gravar(ev.currentTarget, d => d.categorias.excluir(c.id)) }, icon('trash', 'ico sm'))))));
}
