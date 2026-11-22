// Operações que gravam no banco, montadas a partir das regras do domínio. Todas terminam recarregando o estado.
import * as C from './dominio/competencia.js?v=__BUILD__';
import * as R from './dominio/recorrencia.js?v=__BUILD__';
import { registro, parcelas } from './dominio/lancamento.js?v=__BUILD__';
import { indiceCategorias, sugerirCategoria, plano } from './dominio/importacao.js?v=__BUILD__';
import * as dados from './dados.js?v=__BUILD__';
import { estado, recarregar, pref, lembrarCompetencia } from './estado.js?v=__BUILD__';

const camposDaRecorrencia = r => ({ descricao: r.descricao, valor: r.valor, tipo: r.tipo, categoria: r.categoria, forma_pagamento: r.forma_pagamento, assinatura: r.assinatura });

/** Gera as projeções que faltam de todas as recorrências até `ate` (ou até o horizonte usual). Devolve quantas criou. */
async function projetar(ate = R.horizonte(estado.rows, pref.ler('projate'))) {
  const novas = R.projecoesAte(estado.rows, ate);
  await dados.inserir(novas);
  return { qtd: novas.length, ate };
}

/**
 * Grava um lançamento do formulário. Novo e parcelado: cria uma parcela por mês.
 * Recorrente com escopo 'todos': os lançamentos seguintes recebem os mesmos dados (datas no mesmo dia de cada mês);
 * ao deixar de ser recorrente, as projeções seguintes são apagadas.
 */
export async function salvarLancamento(form, original = {}, escopo = 'um') {
  const r = registro(form);
  let msg = null;
  if (!original.id && r.parcelas_total > 1) {
    await dados.inserir(parcelas(form, { total: r.parcelas_total }));
    msg = `${r.parcelas_total} parcelas criadas de ${form.competencia} em diante.`;
  } else if (original.id) {
    await dados.atualizar(original.id, r);
    if (escopo === 'todos') {
      const seg = R.seguintes(estado.rows, original);
      if (!r.recorrente) {
        await dados.excluir(seg.filter(x => x.projetado).map(x => x.id));
        await dados.atualizarTodos(seg.filter(x => !x.projetado).map(x => x.id), { recorrente: false, assinatura: false });
      } else {
        await dados.atualizarCada(seg.map(x => { const k = C.entre(r.competencia, x.competencia), dt = C.somaMeses(r.data_transacao, k), dp = C.somaMeses(r.data_pagamento, k);
          return { id: x.id, campos: { ...camposDaRecorrencia(r), ...(dt && { data_transacao: dt }), ...(dp && { data_pagamento: dp }) } }; }));
      }
    }
  } else await dados.inserir([r]);
  lembrarCompetencia(form.competencia);
  await recarregar();
  if (r.recorrente && !original.recorrente) { // passou a repetir: gera os meses seguintes
    const p = await projetar();
    if (p.qtd) { msg = `${p.qtd} projeção(ões) gerada(s) até ${C.rotulo(p.ate)}.`; await recarregar(); }
  }
  return msg;
}

/** Exclui um lançamento; escopo 'todos' (recorrente) leva junto os seguintes; 'parcelas' leva as parcelas seguintes da compra. */
export async function excluirLancamento(r, escopo = 'um') {
  if (escopo !== 'um') await recarregar(); // pega também o que foi lançado em outro aparelho
  const ids = escopo === 'todos' ? [r.id, ...R.seguintes(estado.rows, r).map(x => x.id)]
    : escopo === 'parcelas' && r.grupo ? estado.rows.filter(x => x.grupo === r.grupo && C.compara(x.competencia, r.competencia) >= 0).map(x => x.id)
    : [r.id];
  await dados.excluir(ids);
  await recarregar();
  return ids.length;
}

/** Troca a categoria na própria linha da lista, sem recarregar tudo (a lista continua onde estava). */
export async function categorizar(r, categoria) { await dados.atualizar(r.id, { categoria }); r.categoria = categoria; }

/** Projeções de uma recorrência a partir de `desde`: alterar dados (com o dia de vencimento) ou apagar. */
export async function alterarProjecoes(modelo, desde, campos, diaVencimento) {
  const alvo = R.daRecorrencia(estado.rows, modelo, desde, { soProjecoes: true });
  await dados.atualizarCada(alvo.map(x => ({ id: x.id, campos: { ...campos, data_pagamento: C.diaNoMes(x.competencia, diaVencimento) } })));
  await recarregar(); return alvo.length;
}
export async function apagarProjecoes(modelo = null, desde = null) {
  const ids = (modelo ? R.daRecorrencia(estado.rows, modelo, desde, { soProjecoes: true }) : estado.rows.filter(r => r.projetado)).map(r => r.id);
  await dados.excluir(ids); await recarregar(); return ids.length;
}
export const salvarSaldoInicial = async v => { await dados.salvarSaldoInicial(v); await recarregar(); };
/** Cadastros (categorias, formas, metas): grava e recarrega. */
export const cadastro = async fn => { await fn(dados); await recarregar(); };
export async function gerarProjecoes(ate) { pref.gravar('projate', ate); const p = await projetar(ate); await recarregar(); return p.qtd; }

/** Grava os itens selecionados da revisão de importação; com assinatura nova, gera as projeções. */
export async function importar(selecionados, forma, comp) {
  const { inserir, confirmar } = plano(selecionados, estado.rows, forma, comp);
  await dados.atualizarCada(confirmar);
  await dados.inserir(inserir);
  lembrarCompetencia(comp);
  await recarregar();
  if (selecionados.some(x => x.assinatura)) { await projetar(); await recarregar(); }
  return inserir.length;
}

/** Classifica os pendentes pela categoria mais usada em descrições iguais/parecidas do histórico. */
export async function autocategorizar() {
  await recarregar(); // o histórico pode ter mudado em outro aparelho
  const indice = indiceCategorias(estado.rows);
  const mudancas = estado.rows.filter(r => !r.categoria).map(r => ({ id: r.id, campos: { categoria: sugerirCategoria(indice, r.descricao) } })).filter(x => x.campos.categoria);
  await dados.atualizarCada(mudancas); await recarregar(); return mudancas.length;
}
