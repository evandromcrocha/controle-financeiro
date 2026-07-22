export function formatBRL(value: number): string {
  return (value ?? 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

const MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

// competencia no formato MM/YYYY -> "Junho 2026"
export function labelCompetencia(comp: string | null): string {
  if (!comp || !comp.includes('/')) return comp ?? '—';
  const [mm, yyyy] = comp.split('/');
  const idx = parseInt(mm, 10) - 1;
  return `${MESES[idx] ?? mm} ${yyyy}`;
}

export function compToRef(comp: string): string | null {
  if (!comp || !comp.includes('/')) return null;
  const [mm, yyyy] = comp.split('/');
  return `${yyyy}-${mm.padStart(2, '0')}-01`;
}

export function refToComp(ref: string): string {
  const d = new Date(ref);
  return `${String(d.getUTCMonth() + 1).padStart(2, '0')}/${d.getUTCFullYear()}`;
}

// competência atual MM/YYYY
export function currentComp(): string {
  const d = new Date();
  return `${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}

export function formatDate(d: string | null): string {
  if (!d) return '—';
  const [y, m, day] = d.split('-');
  return `${day}/${m}/${y}`;
}
