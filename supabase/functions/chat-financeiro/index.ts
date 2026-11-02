// Edge Function: chat-financeiro
// Chat para perguntas sobre os dados financeiros do usuário logado.
// A IA (Claude) consulta os lançamentos por ferramentas; as consultas rodam com o
// JWT do usuário, então a RLS garante que ela só enxerga os dados dele.
// O histórico volta inteiro para o app e é reenviado sem alterações (append-only).
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Anthropic from "npm:@anthropic-ai/sdk";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

const MODEL = "claude-haiku-5-5";
const MAX_PASSOS = 8;

// system e tools ficam fixos durante toda a conversa (não incluir nada variável aqui)
const SYSTEM = `Você é o assistente financeiro do app "Controle Financeiro" do usuário. Responda em português do Brasil, de forma direta e curta, com valores em R$ no formato brasileiro (R$ 1.234,56).
Use as ferramentas para buscar os números; nunca invente valores. Se a pergunta for ambígua quanto ao período, assuma o mês atual e diga isso.
Conceitos do app:
- competência (MM/AAAA) = mês da fatura/extrato em que o lançamento conta. É o padrão para "gastos do mês".
- data da compra (data_transacao) = dia em que a compra foi feita; vencimento (data_pagamento) = dia em que a fatura/conta vence.
- tipo DÉBITO = saída/gasto; tipo CRÉDITO = entrada (salário, estorno, reembolso). Estorno no cartão reduz a fatura.
- projetado = lançamento futuro gerado a partir de um recorrente; parcelas_total > 1 = compra parcelada (parcela_num/parcelas_total).
- forma_pagamento = cartão ou conta (ex.: NUBANK, ITAÚ, CONTA).
Quando listar lançamentos, mostre no máximo uns 15 e diga o total. Use tabelas markdown simples quando ajudar. Ao final, se fizer sentido, ofereça um próximo passo útil (comparar com outro mês, ver por categoria etc.).`;

const filtros = {
  competencia_de: { type: "string", description: "Competência inicial MM/AAAA (inclusive)" },
  competencia_ate: { type: "string", description: "Competência final MM/AAAA (inclusive)" },
  data_compra_de: { type: "string", description: "Data da compra inicial AAAA-MM-DD" },
  data_compra_ate: { type: "string", description: "Data da compra final AAAA-MM-DD" },
  tipo: { type: "string", enum: ["DÉBITO", "CRÉDITO"] },
  categoria: { type: "string", description: "Nome exato da categoria (maiúsculas)" },
  forma_pagamento: { type: "string", description: "Nome exato do cartão/conta" },
  texto: { type: "string", description: "Trecho da descrição (busca sem diferenciar maiúsculas)" },
  incluir_projetados: { type: "boolean", description: "Incluir lançamentos projetados (padrão: true)" },
};

const TOOLS: Anthropic.Tool[] = [
  {
    name: "consultar_lancamentos",
    description: "Lista lançamentos que atendem aos filtros, com os totais de entradas e saídas. Retorna no máximo 'limite' linhas (padrão 50, máx. 300), ordenadas pela ordem pedida.",
    input_schema: {
      type: "object",
      properties: {
        ...filtros,
        ordenar_por: { type: "string", enum: ["valor_desc", "valor_asc", "data_desc", "data_asc"] },
        limite: { type: "integer" },
      },
    },
  },
  {
    name: "totais_agrupados",
    description: "Soma entradas, saídas e quantidade de lançamentos agrupando por um campo (competência, categoria, cartão/conta, dia da semana ou descrição), com os mesmos filtros.",
    input_schema: {
      type: "object",
      properties: {
        agrupar_por: { type: "string", enum: ["competencia", "categoria", "forma_pagamento", "dia_semana", "descricao"] },
        ...filtros,
      },
      required: ["agrupar_por"],
    },
  },
];

const ref = (c?: string) => {
  const m = /^(\d{2})\/(\d{4})$/.exec(c ?? "");
  return m ? `${m[2]}-${m[1]}-01` : null;
};
const DIAS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
const r2 = (n: number) => Math.round(n * 100) / 100;

// deno-lint-ignore no-explicit-any
async function buscar(supabase: any, f: any) {
  const out: any[] = [];
  for (let de = 0; de < 20000; de += 1000) {
    let q = supabase.from("lancamentos")
      .select("descricao,valor,tipo,categoria,forma_pagamento,competencia,competencia_ref,data_transacao,data_pagamento,parcela_num,parcelas_total,projetado,dia_semana")
      .order("competencia_ref").range(de, de + 999);
    if (ref(f.competencia_de)) q = q.gte("competencia_ref", ref(f.competencia_de));
    if (ref(f.competencia_ate)) q = q.lte("competencia_ref", ref(f.competencia_ate));
    if (f.data_compra_de) q = q.gte("data_transacao", f.data_compra_de);
    if (f.data_compra_ate) q = q.lte("data_transacao", f.data_compra_ate);
    if (f.tipo) q = q.eq("tipo", f.tipo);
    if (f.categoria) q = q.ilike("categoria", f.categoria);
    if (f.forma_pagamento) q = q.ilike("forma_pagamento", f.forma_pagamento);
    if (f.texto) q = q.ilike("descricao", `%${f.texto}%`);
    if (f.incluir_projetados === false) q = q.eq("projetado", false);
    const { data, error } = await q;
    if (error) throw new Error(error.message);
    out.push(...(data ?? []));
    if (!data || data.length < 1000) break;
  }
  return out;
}

// deno-lint-ignore no-explicit-any
async function executar(supabase: any, nome: string, input: any) {
  const rows = await buscar(supabase, input ?? {});
  const tot = { entradas: 0, saidas: 0 };
  rows.forEach((r) => (r.tipo === "CRÉDITO" ? (tot.entradas += Math.abs(+r.valor)) : (tot.saidas += Math.abs(+r.valor))));
  const resumo = { quantidade: rows.length, entradas: r2(tot.entradas), saidas: r2(tot.saidas), resultado: r2(tot.entradas - tot.saidas) };

  if (nome === "consultar_lancamentos") {
    const ord = input?.ordenar_por ?? "data_desc";
    const dt = (r: any) => r.data_transacao ?? r.data_pagamento ?? r.competencia_ref ?? "";
    rows.sort((a, b) =>
      ord === "valor_desc" ? Math.abs(b.valor) - Math.abs(a.valor)
      : ord === "valor_asc" ? Math.abs(a.valor) - Math.abs(b.valor)
      : ord === "data_asc" ? dt(a).localeCompare(dt(b))
      : dt(b).localeCompare(dt(a)));
    const limite = Math.min(Math.max(Number(input?.limite) || 50, 1), 300);
    return {
      ...resumo,
      linhas_retornadas: Math.min(limite, rows.length),
      lancamentos: rows.slice(0, limite).map((r) => ({
        descricao: r.descricao, valor: Math.abs(+r.valor), tipo: r.tipo, categoria: r.categoria,
        cartao_conta: r.forma_pagamento, competencia: r.competencia, data_compra: r.data_transacao,
        vencimento: r.data_pagamento,
        parcela: r.parcelas_total > 1 ? `${r.parcela_num ?? "?"}/${r.parcelas_total}` : null,
        projetado: !!r.projetado,
      })),
    };
  }

  if (nome === "totais_agrupados") {
    const campo = input?.agrupar_por;
    const g = new Map<string, { entradas: number; saidas: number; qtd: number }>();
    rows.forEach((r) => {
      const k = campo === "dia_semana" ? (r.dia_semana != null ? DIAS[r.dia_semana] : "sem data")
        : String(r[campo] ?? "(vazio)");
      const v = g.get(k) ?? { entradas: 0, saidas: 0, qtd: 0 };
      r.tipo === "CRÉDITO" ? (v.entradas += Math.abs(+r.valor)) : (v.saidas += Math.abs(+r.valor));
      v.qtd++;
      g.set(k, v);
    });
    const grupos = [...g.entries()].map(([k, v]) => ({ grupo: k, entradas: r2(v.entradas), saidas: r2(v.saidas), resultado: r2(v.entradas - v.saidas), quantidade: v.qtd }));
    if (campo === "competencia") grupos.sort((a, b) => (ref(a.grupo) ?? "").localeCompare(ref(b.grupo) ?? ""));
    else grupos.sort((a, b) => b.saidas - a.saidas || b.entradas - a.entradas);
    return { ...resumo, grupos: grupos.slice(0, 200) };
  }
  throw new Error("Ferramenta desconhecida: " + nome);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
      db: { schema: "financeiro" },
    });
    const { data: u } = await supabase.auth.getUser();
    if (!u?.user) return json({ ok: false, erro: "Não autenticado." }, 401);

    const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!apiKey) return json({ ok: false, erro: "Chave de IA não configurada no servidor (ANTHROPIC_API_KEY)." }, 500);

    const body = await req.json();
    const messages: Anthropic.MessageParam[] = Array.isArray(body.messages) ? body.messages : [];
    if (!messages.length || messages[messages.length - 1].role !== "user") {
      return json({ ok: false, erro: "Mensagem vazia." }, 400);
    }

    const client = new Anthropic({ apiKey });
    for (let passo = 0; passo < MAX_PASSOS; passo++) {
      // deno-lint-ignore no-explicit-any
      const resp: any = await client.messages.create({
        model: MODEL,
        max_tokens: 16000,
        system: SYSTEM,
        tools: TOOLS,
        messages,
        thinking: { type: "adaptive" },
        output_config: { effort: "low" },
      // deno-lint-ignore no-explicit-any
      } as any);

      messages.push({ role: "assistant", content: resp.content });

      if (resp.stop_reason === "refusal") {
        return json({ ok: true, messages, resposta: "Não consigo responder essa pergunta." });
      }
      if (resp.stop_reason !== "tool_use") {
        const texto = resp.content.filter((b: any) => b.type === "text").map((b: any) => b.text).join("\n").trim();
        return json({ ok: true, messages, resposta: texto || "(sem resposta)" });
      }

      // executa todas as ferramentas pedidas e devolve os resultados numa única mensagem
      const resultados = await Promise.all(
        resp.content.filter((b: any) => b.type === "tool_use").map(async (b: any) => {
          try {
            return { type: "tool_result", tool_use_id: b.id, content: JSON.stringify(await executar(supabase, b.name, b.input)) };
          } catch (e) {
            return { type: "tool_result", tool_use_id: b.id, is_error: true, content: String((e as Error)?.message ?? e) };
          }
        }),
      );
      // deno-lint-ignore no-explicit-any
      messages.push({ role: "user", content: resultados as any });
    }
    return json({ ok: true, messages, resposta: "A consulta ficou longa demais. Tente uma pergunta mais específica." });
  } catch (e) {
    if (e instanceof Anthropic.RateLimitError) return json({ ok: false, erro: "Muitas perguntas seguidas. Aguarde alguns segundos." }, 429);
    if (e instanceof Anthropic.AuthenticationError) return json({ ok: false, erro: "Chave da IA inválida no servidor." }, 500);
    if (e instanceof Anthropic.APIError) return json({ ok: false, erro: `Erro da IA (${e.status}): ${e.message}` }, 502);
    return json({ ok: false, erro: String((e as Error)?.message ?? e) }, 500);
  }
});
