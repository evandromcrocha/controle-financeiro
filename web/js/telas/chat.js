// Chat com a IA sobre os lançamentos (Edge Function chat-financeiro).
import * as C from '../dominio/competencia.js?v=__BUILD__';
import { estado } from '../estado.js?v=__BUILD__';
import * as dados from '../dados.js?v=__BUILD__';
import { $, el, icon, toast } from '../ui.js?v=__BUILD__';

const esc = x => x.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const inline = x => esc(x).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/`([^`]+)`/g, '<code>$1</code>');
/** Markdown simples das respostas: tabelas, listas, títulos e parágrafos. */
const markdown = t => {
  const L = t.split('\n'); let h = '', i = 0;
  const bloco = (re, tag) => { h += `<${tag}>`; while (i < L.length && re.test(L[i])) h += '<li>' + inline(L[i++].replace(re, '')) + '</li>'; h += `</${tag}>`; };
  while (i < L.length) {
    const l = L[i];
    if (/^\s*\|/.test(l) && i + 1 < L.length && /^\s*\|?\s*:?-{2,}/.test(L[i + 1])) {
      const cel = x => x.trim().replace(/^\||\|$/g, '').split('|').map(c => c.trim());
      h += '<div class="tablewrap"><table><thead><tr>' + cel(l).map(c => `<th>${inline(c)}</th>`).join('') + '</tr></thead><tbody>'; i += 2;
      while (i < L.length && /^\s*\|/.test(L[i])) h += '<tr>' + cel(L[i++]).map(c => `<td>${inline(c)}</td>`).join('') + '</tr>';
      h += '</tbody></table></div>';
    } else if (/^\s*[-*] /.test(l)) bloco(/^\s*[-*] /, 'ul');
    else if (/^\s*\d+\. /.test(l)) bloco(/^\s*\d+\. /, 'ol');
    else { if (/^#{1,4} /.test(l)) h += '<p><b>' + inline(l.replace(/^#+ /, '')) + '</b></p>'; else if (l.trim()) h += '<p>' + inline(l) + '</p>'; i++; }
  }
  return h;
};

const SUGESTOES = ['Quanto gastei este mês por categoria?', 'Quais foram meus 10 maiores gastos em outubro?', 'Compare meus gastos dos últimos 6 meses', 'Quanto gastei com ALIMENTAÇÃO este ano?', 'Qual cartão mais pesa na fatura deste mês?', 'Quais assinaturas recorrentes eu pago?'];
let conversa = []; // mensagens no formato da API; `_exibir` guarda o texto digitado (sem o contexto)

function abrirChat() {
  if ($('#chatPanel')) return $('#chatPanel').remove();
  const log = el('div', { class: 'chatlog' });
  const inp = el('textarea', { rows: 1, placeholder: 'Pergunte sobre seus gastos…', onkeydown: e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); enviar(); } } });
  const btn = el('button', { class: 'btn', title: 'Enviar', onclick: () => enviar() }, 'Enviar');
  const p = el('div', { id: 'chatPanel', class: 'chatpanel' },
    el('div', { class: 'chathead' }, el('div', {}, el('b', {}, 'Pergunte aos seus dados'), el('div', { class: 'muted', style: 'font-size:12px' }, 'A IA consulta seus lançamentos para responder')),
      el('div', { style: 'display:flex;gap:6px' }, el('button', { class: 'iconbtn', title: 'Nova conversa', onclick: () => { conversa = []; desenha(); } }, '↺'), el('button', { class: 'iconbtn', title: 'Fechar', onclick: () => p.remove() }, '✕'))),
    log, el('div', { class: 'chatin' }, inp, btn));
  document.body.append(p);

  function desenha(pendente) {
    const vis = conversa.flatMap(m => m.role === 'user' && typeof m.content === 'string' ? [{ eu: true, t: m._exibir || m.content }]
      : m.role === 'assistant' ? [(m.content || []).filter(b => b.type === 'text').map(b => b.text).join('\n').trim()].filter(Boolean).map(t => ({ eu: false, t })) : []);
    log.replaceChildren(...(vis.length ? [] : [el('div', { class: 'muted', style: 'font-size:13px;margin-bottom:8px' }, 'Experimente:'), ...SUGESTOES.map(q => el('button', { class: 'chatsug', onclick: () => { inp.value = q; enviar(); } }, q))]),
      ...vis.map(m => el('div', { class: 'msg ' + (m.eu ? 'eu' : 'ia'), ...(m.eu ? {} : { html: markdown(m.t) }) }, m.eu ? m.t : null)),
      ...(pendente ? [el('div', { class: 'msg ia' }, el('span', { class: 'dots' }, el('i'), el('i'), el('i')), ' consultando seus dados…')] : []));
    log.scrollTop = log.scrollHeight;
  }
  async function enviar() {
    const q = inp.value.trim(); if (!q || btn.disabled) return;
    inp.value = ''; btn.disabled = true;
    // o contexto vai na 1ª mensagem da conversa (o histórico nunca é editado depois)
    const ctx = conversa.length ? '' : `[Contexto: hoje é ${new Date().toLocaleDateString('pt-BR')}; mês atual ${C.atual()}; mês aberto no app ${estado.comp}. Categorias: ${estado.cats.map(c => c.nome).join(', ')}. Cartões/contas: ${estado.formas.map(f => f.nome).join(', ')}.]\n\n`;
    const antes = conversa;
    conversa = [...conversa, { role: 'user', content: ctx + q, _exibir: q }]; desenha(true);
    try {
      const { messages } = await dados.invocar('chat-financeiro', { messages: conversa.map(({ _exibir, ...m }) => m) });
      messages.forEach((m, i) => { if (conversa[i]?._exibir) m._exibir = conversa[i]._exibir; });
      conversa = messages;
    } catch (e) { conversa = antes; toast(e.message || String(e)); inp.value = q; }
    btn.disabled = false; desenha(); inp.focus();
  }
  desenha(); setTimeout(() => inp.focus(), 50);
}

export const mostrarChat = () => { if (!$('#chatFab')) document.body.append(el('button', { id: 'chatFab', class: 'chatfab', title: 'Perguntar à IA', onclick: abrirChat }, icon('sparkle'), el('span', {}, 'Perguntar'))); };
export const esconderChat = () => { $('#chatFab')?.remove(); $('#chatPanel')?.remove(); conversa = []; };
