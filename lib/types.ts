export type Tipo = 'CRÉDITO' | 'DÉBITO';

export interface Lancamento {
  id: string;
  user_id: string;
  descricao: string;
  data_transacao: string | null;
  parcela_atual: number | null;
  parcelas_total: number | null;
  forma_pagamento: string | null;
  categoria: string | null;
  pagador: string | null;
  tipo: Tipo;
  valor: number;
  valor_final: number;
  data_pagamento: string | null;
  competencia: string | null;
  competencia_ref: string | null;
  recorrente: boolean;
  created_at: string;
}

export interface FormaPagamento {
  id: string;
  user_id: string;
  nome: string;
  tipo: 'CARTAO' | 'CONTA' | 'DINHEIRO';
  dia_vencimento: number | null;
  cor: string | null;
}

export interface Categoria {
  id: string;
  user_id: string;
  nome: string;
  cor: string | null;
}
