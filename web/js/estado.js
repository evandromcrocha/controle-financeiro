// Estado do app: dados carregados do banco + escolhas do usuário. As telas leem daqui e pedem `recarregar()` após gravar.
import * as C from './dominio/competencia.js?v=__BUILD__';
import * as dados from './dados.js?v=__BUILD__';
import { porMes } from './dominio/agregados.js?v=__BUILD__';

export const estado = {
  rows: [], cats: [], formas: [], orc: [], saldoIni: 0, meses: new Map(), email: '',
  comp: C.atual(), comps: [], tab: 'resumo',
};

const ouvintes = new Set();
export const aoMudar = fn => ouvintes.add(fn);
const avisar = () => ouvintes.forEach(fn => fn());

export const doMes = (c = estado.comp) => estado.rows.filter(r => r.competencia === c);
export const forma = nome => estado.formas.find(f => f.nome === nome);

export async function recarregar() {
  Object.assign(estado, await dados.carregar());
  estado.meses = porMes(estado.rows);
  estado.comps = [...estado.meses.keys()];
  // abre no mês atual; se não houver dados nele, no mês com dados mais próximo
  if (!estado.comps.includes(estado.comp) && estado.comps.length)
    estado.comp = estado.comps.reduce((a, b) => (Math.abs(C.entre(b, C.atual())) < Math.abs(C.entre(a, C.atual())) ? b : a));
  avisar();
}

/** Preferências guardadas no navegador (podem não existir em modo privado). */
export const pref = {
  ler: (k, padrao = null) => { try { return localStorage.getItem('cf-' + k) ?? padrao; } catch { return padrao; } },
  gravar: (k, v) => { try { localStorage.setItem('cf-' + k, v); } catch {} },
};
/** Último mês usado ao lançar/importar, sugerido no próximo. */
export const ultimaCompetencia = () => pref.ler('lastcomp', estado.comp);
export const lembrarCompetencia = c => pref.gravar('lastcomp', c);
