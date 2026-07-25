// Edge Function: importar-fatura
// Recebe um PDF de fatura, extrai o texto, usa IA (Claude) para estruturar as
// compras, compara com o que já existe e insere as faltantes como PENDENTES.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { extractText, getDocumentProxy } from "https://esm.sh/unpdf@0.12.1";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

// --- helpers de dedupe ---
const norm = (s: string) =>
  (s || "")
    .normalize("NFKD").replace(new RegExp("[\u0300-\u036f]","g"), "")
    .toLowerCase()
    .replace(/-?\s*parcela\s*\d+\s*(\/|de)\s*\d+/g, "")
    .replace(/[^a-z0-9 ]/g, " ")
    .split(/\s+/).filter(Boolean);

function jaExiste(desc: string, valor: number, existentes: { descricao: string; valor: number }[]) {
  const nd = new Set(norm(desc));
  for (const e of existentes) {
    const ne = new Set(norm(e.descricao));
    const overlap = [...nd].some((w) => ne.has(w));
    if (Math.abs(valor - Number(e.valor)) <= 0.6 && overlap) return true;
  }
  return false;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } }, db: { schema: "financeiro" } },
    );
    const { data: userData } = await supabase.auth.getUser();
    if (!userData?.user) return json({ ok: false, erro: "Não autenticado." }, 401);

    const { pdfBase64, cartao, competencia } = await req.json();
    if (!pdfBase64 || !cartao) return json({ ok: false, erro: "Informe o PDF e o cartão." }, 400);

    // 1) extrair texto do PDF
    const bytes = Uint8Array.from(atob(pdfBase64), (c) => c.charCodeAt(0));
    const pdf = await getDocumentProxy(bytes);
    const { text } = await extractText(pdf, { mergePages: true });
    if (!text || text.length < 30) return json({ ok: false, erro: "Não consegui ler o texto do PDF." }, 422);

    // 2) IA estrutura as compras
    const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!apiKey) return json({ ok: false, erro: "Chave de IA não configurada no servidor (ANTHROPIC_API_KEY)." }, 500);

    const prompt =
      `Você recebe o texto de uma fatura de cartão de crédito brasileira. ` +
      `Extraia SOMENTE as COMPRAS/consumos do titular (NÃO inclua pagamentos da fatura, estornos, créditos, ajustes, ` +
      `saldos, limites, totais, subtotais, tarifas de parcelamento nem linhas de resumo). ` +
      `Responda EXCLUSIVAMENTE com JSON no formato: ` +
      `{"competencia":"MM/AAAA","vencimento":"AAAA-MM-DD","compras":[{"data":"AAAA-MM-DD","descricao":"texto","valor":123.45,"parcela_atual":1,"parcela_total":1}]}. ` +
      `A "competencia" deve ser o mês/ano do vencimento da fatura. "valor" sempre positivo. ` +
      `Se não houver parcelas, use parcela_atual=1 e parcela_total=1. Não invente linhas. ` +
      `Texto da fatura:\n\n` + text.slice(0, 60000);

    const aiResp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": apiKey, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 8000,
        messages: [{ role: "user", content: prompt }],
      }),
    });
    if (!aiResp.ok) {
      const t = await aiResp.text();
      return json({ ok: false, erro: "Falha na IA: " + t.slice(0, 300) }, 502);
    }
    const aiData = await aiResp.json();
    let raw = aiData?.content?.[0]?.text ?? "";
    raw = raw.replace(/```json/gi, "").replace(/```/g, "").trim();
    let parsed: any;
    try { parsed = JSON.parse(raw); } catch { return json({ ok: false, erro: "IA retornou formato inesperado." }, 502); }

    const comp = competencia || parsed.competencia;
    if (!/^\d{2}\/\d{4}$/.test(comp || "")) return json({ ok: false, erro: "Não identifiquei a competência (MM/AAAA)." }, 422);
    const [mm, yy] = comp.split("/");
    const compRef = `${yy}-${mm}-01`;
    const compras = Array.isArray(parsed.compras) ? parsed.compras : [];

    // 3) dedupe contra o existente (mesmo cartão + competência)
    const { data: existentes } = await supabase
      .from("lancamentos").select("descricao, valor")
      .eq("forma_pagamento", cartao).eq("competencia", comp);

    const novos: any[] = [];
    let ignorados = 0;
    for (const c of compras) {
      const valor = Math.abs(Number(c.valor) || 0);
      if (!c.descricao || valor <= 0) continue;
      if (jaExiste(c.descricao, valor, existentes ?? [])) { ignorados++; continue; }
      novos.push({
        descricao: String(c.descricao).slice(0, 200),
        valor, valor_final: -valor, tipo: "DÉBITO",
        forma_pagamento: cartao, categoria: null,
        parcelas_total: Number(c.parcela_total) || 1,
        data_pagamento: /^\d{4}-\d{2}-\d{2}$/.test(c.data) ? c.data : null,
        competencia: comp, competencia_ref: compRef,
      });
    }

    if (novos.length) {
      const { error } = await supabase.from("lancamentos").insert(novos);
      if (error) return json({ ok: false, erro: "Erro ao salvar: " + error.message }, 500);
    }

    return json({
      ok: true, competencia: comp,
      total_extraido: compras.length, inseridos: novos.length, ignorados,
      itens: novos.map((n) => ({ descricao: n.descricao, valor: n.valor })),
    });
  } catch (e) {
    return json({ ok: false, erro: String(e?.message || e) }, 500);
  }
});
