// Ponto de entrada: login, navegação entre telas, seletor de mês e tema.
import * as C from './dominio/competencia.js?v=__BUILD__';
import { estado, aoMudar, recarregar } from './estado.js?v=__BUILD__';
import * as dados from './dados.js?v=__BUILD__';
import { $, el, icon, toast } from './ui.js?v=__BUILD__';
import { aplicarTema, alternarTema, aoTrocarTema, temaAtual } from './tema.js?v=__BUILD__';
import { mostrarChat, esconderChat } from './telas/chat.js?v=__BUILD__';
import * as resumo from './telas/resumo.js?v=__BUILD__';
import * as lancamentos from './telas/lancamentos.js?v=__BUILD__';
import * as relatorios from './telas/relatorios.js?v=__BUILD__';
import * as projecoes from './telas/projecoes.js?v=__BUILD__';
import * as ajustes from './telas/ajustes.js?v=__BUILD__';

// [id, ícone, título, tela, usa o seletor de mês]
const TELAS = [['resumo', 'home', 'Resumo', resumo, true], ['lanc', 'list', 'Lançamentos', lancamentos, true], ['rel', 'chart', 'Relatórios', relatorios, false],
  ['proj', 'sparkle', 'Projeções', projecoes, false], ['ajustes', 'gear', 'Ajustes', ajustes, false]];

function desenhar() {
  const [, , titulo, tela, comMes] = TELAS.find(t => t[0] === estado.tab);
  $('#title').textContent = titulo;
  $('#compWrap').style.display = comMes ? '' : 'none';
  $('#nav').replaceChildren(...TELAS.map(([id, ic, lb]) => el('button', { class: estado.tab === id ? 'active' : '', onclick: () => { estado.tab = id; desenhar(); } }, icon(ic), lb)));
  desenharMes();
  const v = $('#view'); v.replaceChildren(); tela.render(v);
}

function desenharMes() {
  const [m, y] = estado.comp.split('/');
  const anos = [...new Set([...estado.comps.map(C.ano), y])].sort();
  $('#mesSel').replaceChildren(...C.MESES.map((n, i) => { const v = String(i + 1).padStart(2, '0'); return el('option', { value: v, ...(v === m ? { selected: 1 } : {}) }, n); }));
  $('#anoSel').replaceChildren(...anos.map(a => el('option', { value: a, ...(a === y ? { selected: 1 } : {}) }, a)));
}
const irPara = c => { estado.comp = c; desenhar(); };
$('#mesSel').onchange = $('#anoSel').onchange = () => irPara($('#mesSel').value + '/' + $('#anoSel').value);
$('#compPrev').onclick = () => irPara(C.desloca(estado.comp, -1));
$('#compNext').onclick = () => irPara(C.desloca(estado.comp, 1));

aoTrocarTema(t => $('#btnTheme').replaceChildren(icon(t === 'dark' ? 'sun' : 'moon', 'ico sm')));
$('#btnTheme').onclick = alternarTema;
aplicarTema(temaAtual());

// usuário conectado: menu lateral e, no celular, topo
function mostrarUsuario(email) {
  const av = () => el('span', { class: 'uav' }, (email[0] || '?').toUpperCase());
  $('#userBox').replaceChildren(...(email ? [av(), el('span', { class: 'uinfo' }, el('span', { class: 'muted', style: 'font-size:11px' }, 'Conectado como'), el('span', { class: 'uemail', title: email }, email))] : []));
  $('#userChip').replaceChildren(...(email ? [av(), el('span', { class: 'uemail' }, email)] : []));
}

$('#btnLogin').onclick = async () => { $('#loginErr').textContent = ''; try { await dados.entrar($('#email').value.trim(), $('#pass').value); } catch (e) { $('#loginErr').textContent = e.message; } };
$('#pass').addEventListener('keydown', e => { if (e.key === 'Enter') $('#btnLogin').click(); });
$('#btnLogout').onclick = dados.sair;

aoMudar(desenhar);
let conectado = null;
dados.aoMudarSessao(sessao => {
  const email = sessao?.user?.email || '';
  $('#login').classList.toggle('hidden', !!sessao); $('#app').classList.toggle('hidden', !sessao);
  if (!sessao) { conectado = null; esconderChat(); return; }
  estado.email = email; mostrarUsuario(email); mostrarChat();
  if (conectado !== email) { conectado = email; recarregar().catch(e => toast('Erro: ' + e.message)); } // renovação de token não recarrega
});

// erros inesperados viram aviso na tela em vez de falhar em silêncio
window.addEventListener('unhandledrejection', e => toast('Erro: ' + (e.reason?.message || e.reason || 'falha inesperada')));
