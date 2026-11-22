// Competência = mês da fatura/extrato no formato "MM/AAAA"; datas no formato "AAAA-MM-DD".
export const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

const pad = n => String(n).padStart(2, '0');
export const valida = c => /^\d{2}\/\d{4}$/.test(c || '');
export const dataValida = d => /^\d{4}-\d{2}-\d{2}$/.test(d || '');

export const ordem = c => { const [m, y] = c.split('/'); return +y * 12 + +m; };
const deOrdem = n => pad(((n - 1) % 12) + 1) + '/' + Math.floor((n - 1) / 12);
export const desloca = (c, meses) => deOrdem(ordem(c) + meses);
export const entre = (a, b) => ordem(b) - ordem(a);
export const compara = (a, b) => ordem(a) - ordem(b);
export const maisDistante = lista => lista.reduce((a, b) => (ordem(a) >= ordem(b) ? a : b));

export const atual = () => { const d = new Date(); return pad(d.getMonth() + 1) + '/' + d.getFullYear(); };
export const hoje = () => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };

/** "MM/AAAA" → "AAAA-MM-01" (coluna competencia_ref) */
export const ref = c => { const [m, y] = c.split('/'); return `${y}-${pad(m)}-01`; };
const deRef = r => r.slice(5, 7) + '/' + r.slice(0, 4);
export const ano = c => c.split('/')[1];

export const rotulo = c => { if (!valida(c)) return c || '—'; const [m, y] = c.split('/'); return `${MESES[+m - 1]} ${y}`; };
export const rotuloCurto = c => { const [m, y] = c.split('/'); return MESES[+m - 1].slice(0, 3) + '/' + y.slice(2); };

/** Dia `dia` do mês `c`, limitado ao último dia do mês. */
export const diaNoMes = (c, dia) => {
  const [m, y] = c.split('/').map(Number);
  return `${y}-${pad(m)}-${pad(Math.min(+dia, new Date(y, m, 0).getDate()))}`;
};
/** Mesma data `d` deslocada `meses` meses (o dia é limitado ao fim do mês). */
export const somaMeses = (d, meses) => {
  if (!dataValida(d)) return null;
  return diaNoMes(desloca(deRef(d.slice(0, 7) + '-01'), meses), +d.slice(8, 10));
};
export const dia = d => +d.slice(8, 10);
export const diasEntre = (a, b) => Math.abs((new Date(a + 'T12:00:00') - new Date(b + 'T12:00:00')) / 864e5);
export const fmtData = d => (dataValida(d) ? d.split('-').reverse().join('/') : '');
