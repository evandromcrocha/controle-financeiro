// Tema claro/escuro, lembrado no navegador. O tema inicial é aplicado pelo script no <head> de index.html.
import { pref } from './estado.js?v=__BUILD__';

const ouvintes = new Set();
export const aoTrocarTema = fn => ouvintes.add(fn);
export const temaAtual = () => document.documentElement.getAttribute('data-theme');
export const aplicarTema = t => { document.documentElement.setAttribute('data-theme', t); pref.gravar('theme', t); ouvintes.forEach(fn => fn(t)); };
export const alternarTema = () => aplicarTema(temaAtual() === 'dark' ? 'light' : 'dark');
