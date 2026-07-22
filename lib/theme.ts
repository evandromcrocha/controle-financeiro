export const colors = {
  bg: '#0f172a',
  bgAlt: '#1e293b',
  card: '#1e293b',
  cardAlt: '#334155',
  border: '#334155',
  text: '#f1f5f9',
  textDim: '#94a3b8',
  primary: '#6366f1',
  primaryDim: '#4f46e5',
  green: '#22c55e',
  red: '#ef4444',
  amber: '#f59e0b',
  white: '#ffffff',
};

// paleta rotativa para categorias/cartões
export const palette = [
  '#6366f1', '#22c55e', '#ef4444', '#f59e0b', '#06b6d4',
  '#ec4899', '#8b5cf6', '#14b8a6', '#f97316', '#84cc16',
  '#e11d48', '#0ea5e9', '#a855f7', '#10b981', '#eab308',
];

export function colorFor(key: string): string {
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
  return palette[h % palette.length];
}
