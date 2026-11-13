import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

function normalizeBrasilApi(raw: Record<string, unknown>) {
  return {
    cnpj: String(raw.cnpj ?? "").replace(/\D/g, ""),
    razao_social: String(raw.razao_social ?? ""),
    nome_fantasia: String(raw.nome_fantasia || raw.razao_social || ""),
    situacao_cadastral: String(raw.descricao_situacao_cadastral ?? ""),
    cnae_fiscal_descricao: String(raw.cnae_fiscal_descricao ?? ""),
    logradouro: String(raw.logradouro ?? ""),
    numero: String(raw.numero ?? ""),
    complemento: String(raw.complemento ?? ""),
    bairro: String(raw.bairro ?? ""),
    cep: String(raw.cep ?? ""),
    municipio: String(raw.municipio ?? ""),
    uf: String(raw.uf ?? ""),
    email: String(raw.email ?? ""),
    ddd_telefone_1: String(raw.ddd_telefone_1 ?? ""),
    descricao_porte: String(raw.descricao_porte ?? ""),
    capital_social: Number(raw.capital_social ?? 0),
    opcao_simples: Boolean(raw.opcao_pelo_simples),
    opcao_mei: Boolean(raw.opcao_pelo_mei),
  };
}

function normalizeReceitaWs(raw: Record<string, unknown>) {
  const activities = raw.atividade_principal as { text?: string }[] | undefined;
  return {
    cnpj: String(raw.cnpj ?? "").replace(/\D/g, ""),
    razao_social: String(raw.nome ?? ""),
    nome_fantasia: String(raw.fantasia || raw.nome || ""),
    situacao_cadastral: String(raw.situacao ?? ""),
    cnae_fiscal_descricao: activities?.[0]?.text ?? "",
    logradouro: String(raw.logradouro ?? ""),
    numero: String(raw.numero ?? ""),
    complemento: String(raw.complemento ?? ""),
    bairro: String(raw.bairro ?? ""),
    cep: String(raw.cep ?? ""),
    municipio: String(raw.municipio ?? ""),
    uf: String(raw.uf ?? ""),
    email: String(raw.email ?? ""),
    ddd_telefone_1: String(raw.telefone ?? ""),
    descricao_porte: String(raw.porte ?? ""),
    capital_social: parseFloat(String(raw.capital_social ?? "0").replace(/\./g, "").replace(",", ".")) || 0,
    opcao_simples: (raw.simples as { optante?: string } | undefined)?.optante === "Sim",
    opcao_mei: (raw.mei as { optante?: string } | undefined)?.optante === "Sim",
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    const url = new URL(req.url);
    const cnpjRaw = url.searchParams.get("cnpj") ?? "";
    const cnpj = cnpjRaw.replace(/\D/g, "");

    if (cnpj.length !== 14) {
      return new Response(
        JSON.stringify({ success: false, error: "CNPJ deve ter 14 dígitos.", code: "INVALID_CNPJ" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Try BrasilAPI first
    let normalized: ReturnType<typeof normalizeBrasilApi> | null = null;
    let provider = "brasilapi";
    let usedFallback = false;

    try {
      const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpj}`, {
        signal: AbortSignal.timeout(10000),
      });
      if (res.ok) {
        const data = await res.json() as Record<string, unknown>;
        normalized = normalizeBrasilApi(data);
      }
    } catch {
      // will try fallback
    }

    // Fallback: ReceitaWS
    if (!normalized) {
      try {
        const res = await fetch(`https://receitaws.com.br/v1/cnpj/${cnpj}`, {
          signal: AbortSignal.timeout(15000),
        });
        if (res.ok) {
          const data = await res.json() as Record<string, unknown>;
          if (data.status !== "ERROR") {
            normalized = normalizeReceitaWs(data);
            provider = "receitaws";
            usedFallback = true;
          }
        }
      } catch {
        // both failed
      }
    }

    if (!normalized) {
      await supabase.from("propostaone_cnpj_lookup_logs").insert({ cnpj, provider: "none", success: false, error_code: "BOTH_APIS_FAILED" });
      return new Response(
        JSON.stringify({ success: false, error: "Não foi possível consultar o CNPJ. Tente novamente em instantes.", code: "API_UNAVAILABLE" }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (!normalized.situacao_cadastral || normalized.situacao_cadastral.toLowerCase() !== "ativa") {
      await supabase.from("propostaone_cnpj_lookup_logs").insert({ cnpj, provider, success: false, error_code: "CNPJ_INACTIVE" });
      return new Response(
        JSON.stringify({ success: false, error: `CNPJ com situação "${normalized.situacao_cadastral || "desconhecida"}" na Receita Federal. Apenas CNPJs ativos podem se cadastrar.`, code: "CNPJ_INACTIVE" }),
        { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    await supabase.from("propostaone_cnpj_lookup_logs").insert({ cnpj, provider, success: true });

    return new Response(
      JSON.stringify({ success: true, data: normalized, metadata: { provider, used_fallback: usedFallback } }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro interno";
    return new Response(
      JSON.stringify({ success: false, error: msg, code: "INTERNAL_ERROR" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
