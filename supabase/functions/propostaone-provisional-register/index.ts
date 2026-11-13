import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    const body = await req.json() as {
      cnpj: string;
      razaoSocial: string;
      nomeFantasia?: string;
      cnaeDescricao?: string;
      porte?: string;
      capitalSocial?: number;
      opcaoSimples?: boolean;
      opcaoMei?: boolean;
      email?: string;
      phone?: string;
      addressStreet?: string;
      addressNumber?: string;
      addressComplement?: string;
      addressNeighborhood?: string;
      addressCity?: string;
      addressState?: string;
      addressZipcode?: string;
    };

    const cleanCnpj = body.cnpj.replace(/\D/g, "");

    if (cleanCnpj.length !== 14) {
      return new Response(
        JSON.stringify({ success: false, error: "CNPJ inválido." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Check if CNPJ already exists — return existing id (idempotent)
    const { data: existing } = await supabase
      .from("propostaone_tenants")
      .select("id, registration_step")
      .eq("cnpj", cleanCnpj)
      .maybeSingle();

    if (existing) {
      return new Response(
        JSON.stringify({ success: true, tenantId: existing.id, existing: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const displayName = body.nomeFantasia || body.razaoSocial;
    const addressParts = [body.addressStreet, body.addressNumber].filter(Boolean);

    const { data, error } = await supabase
      .from("propostaone_tenants")
      .insert({
        name: displayName,
        razao_social: body.razaoSocial,
        nome_fantasia: body.nomeFantasia || null,
        cnpj: cleanCnpj,
        cnae_descricao: body.cnaeDescricao || null,
        porte: body.porte || null,
        capital_social: body.capitalSocial || null,
        opcao_simples: body.opcaoSimples ?? false,
        opcao_mei: body.opcaoMei ?? false,
        email: body.email || null,
        phone: body.phone || null,
        address: addressParts.join(", ") || null,
        address_street: body.addressStreet || null,
        address_number: body.addressNumber || null,
        address_complement: body.addressComplement || null,
        address_neighborhood: body.addressNeighborhood || null,
        city: body.addressCity || null,
        state: body.addressState || null,
        registration_step: 1,
        status: "active",
        plan: "free",
      })
      .select("id")
      .single();

    if (error) throw error;

    return new Response(
      JSON.stringify({ success: true, tenantId: data.id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro interno";
    return new Response(
      JSON.stringify({ success: false, error: msg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
