// Comparação de descrições de lançamentos ("Padaria X - Parcela 2/3" ≈ "PADARIA X").
const PARCELA = /\s*-?\s*parcela\s+\d+\s*(\/|de)\s*\d+/gi;

/** Descrição sem a indicação de parcela ("- Parcela 2/3", " 02/03" no fim). */
export const semParcela = s => (s || '').replace(PARCELA, '').replace(/\s+\d{1,2}\/\d{1,2}$/, '').trim();

export const normalizar = s => (s || '').normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase()
  .replace(PARCELA, '').replace(/\b\d{1,2}\/\d{1,2}\b/g, '').replace(/[^a-z0-9]+/g, ' ').trim();

const palavras = s => new Set(normalizar(s).split(' ').filter(w => w.length > 2));

/** Fração das palavras da descrição menor que aparecem na outra (0 a 1). */
export const similaridade = (a, b) => {
  const A = palavras(a), B = palavras(b);
  if (!A.size || !B.size) return 0;
  let n = 0; A.forEach(w => { if (B.has(w)) n++; });
  return n / Math.min(A.size, B.size);
};
/** Duas descrições são do mesmo estabelecimento/serviço. */
export const parecidas = (a, b) => similaridade(a, b) >= 0.5;

/** [parcela atual, total] lidos da descrição ("Loja - Parcela 2/5", "LOJA 02/05"); [1,1] se não houver. */
export const parcelaDe = d => {
  const s = String(d || '');
  const m = s.match(/(?:parcela\s*)?(\d{1,2})\s*(?:\/|de)\s*(\d{1,2})\s*$/i) || s.match(/parcela\s*(\d{1,2})\s*(?:\/|de)\s*(\d{1,2})/i);
  return m && +m[2] > 1 && +m[1] <= +m[2] ? [+m[1], +m[2]] : [1, 1];
};
