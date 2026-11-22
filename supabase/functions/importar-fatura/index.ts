// Edge Function: importar-fatura
// Recebe um PDF de fatura, extrai o texto e usa IA (Claude) para estruturar as compras.
// Só lê: a revisão (duplicados, categorias) e a gravação são feitas no app.
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
        model: "claude-haiku-5-5",
        max_tokens: 16000,
        output_config: { effort: "low" },
        messages: [{ role: "user", content: prompt }],
      }),
    });
    if (!aiResp.ok) {
      const t = await aiResp.text();
      return json({ ok: false, erro: "Falha na IA: " + t.slice(0, 300) }, 502);
    }
    const aiData = await aiResp.json();
    // a resposta pode trazer blocos de raciocínio antes do texto
    let raw = (aiData?.content ?? []).filter((b: any) => b.type === "text").map((b: any) => b.text).join("") ?? "";
    raw = raw.replace(/```json/gi, "").replace(/```/g, "").trim();
    let parsed: any;
    try { parsed = JSON.parse(raw); } catch { return json({ ok: false, erro: "IA retornou formato inesperado." }, 502); }

    const comp = competencia || parsed.competencia;
    if (!/^\d{2}\/\d{4}$/.test(comp || "")) return json({ ok: false, erro: "Não identifiquei a competência (MM/AAAA)." }, 422);
    const compras = Array.isArray(parsed.compras) ? parsed.compras : [];
    return json({ ok: true, competencia: comp, vencimento: parsed.vencimento ?? null, compras });
  } catch (e) {
    return json({ ok: false, erro: String(e?.message || e) }, 500);
  }
});
