import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface RegisterBody {
  cnpj: string;
  razao_social: string;
  nome_fantasia?: string;
  display_name?: string;
  cnae_descricao?: string;
  logradouro?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  municipio?: string;
  uf?: string;
  cep?: string;
  email_receita?: string;
  phone_receita?: string;
  fullName: string;
  contactEmail: string;
  whatsapp?: string;
  password: string;
  business_type?: string;
  business_subtype?: string;
  insurance_branches?: string[];
  insurance_subbranches?: string[];
  existingTenantId?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  gclid?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  let createdUserId: string | null = null;
  let createdTenantId: string | null = null;
  let tenantWasNew = false;

  try {
    const body = await req.json() as RegisterBody;

    // Validate required fields
    if (!body.fullName || !body.contactEmail || !body.password || !body.cnpj) {
      return new Response(
        JSON.stringify({ success: false, error: "Campos obrigatórios: fullName, contactEmail, password, cnpj.", code: "MISSING_FIELDS" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const cleanCnpj = body.cnpj.replace(/\D/g, "");

    // Check if email already exists in auth
    const { data: existingUsers } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
    const emailExists = existingUsers?.users?.some(u => u.email?.toLowerCase() === body.contactEmail.toLowerCase());
    if (emailExists) {
      return new Response(
        JSON.stringify({ success: false, error: "Este e-mail já está cadastrado. Faça login ou use outro e-mail.", code: "EMAIL_EXISTS" }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Check CNPJ existence
    const { data: cnpjCheck } = await supabase
      .from("propostaone_tenants")
      .select("id")
      .eq("cnpj", cleanCnpj)
      .neq("id", body.existingTenantId ?? "00000000-0000-0000-0000-000000000000")
      .maybeSingle();

    if (cnpjCheck) {
      // Check if that tenant already has a profile (i.e. full registration)
      const { data: profileCheck } = await supabase
        .from("propostaone_profiles")
        .select("id")
        .eq("tenant_id", cnpjCheck.id)
        .limit(1)
        .maybeSingle();
      if (profileCheck) {
        return new Response(
          JSON.stringify({ success: false, error: "Este CNPJ já possui uma conta ativa. Faça login.", code: "CNPJ_EXISTS" }),
          { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
    }

    // ── STEP 1: Create or update tenant ──────────────────────────────────────
    const tenantPayload = {
      name: body.display_name || body.nome_fantasia || body.razao_social,
      display_name: body.display_name || null,
      razao_social: body.razao_social,
      nome_fantasia: body.nome_fantasia || null,
      cnpj: cleanCnpj,
      cnae_descricao: body.cnae_descricao || null,
      email: body.email_receita || null,
      phone: body.phone_receita || null,
      billing_email: body.contactEmail,
      contact_whatsapp: body.whatsapp || null,
      address_street: body.logradouro || null,
      address_number: body.numero || null,
      address_complement: body.complemento || null,
      address_neighborhood: body.bairro || null,
      city: body.municipio || null,
      state: body.uf || null,
      address: body.logradouro ? `${body.logradouro}, ${body.numero}` : null,
      registration_step: 3,
      plan: "free" as const,
      status: "active" as const,
      utm_source: body.utm_source || null,
      utm_medium: body.utm_medium || null,
      utm_campaign: body.utm_campaign || null,
      gclid: body.gclid || null,
      business_type: body.business_type || null,
      business_subtype: body.business_subtype || null,
      insurance_branches: body.insurance_branches?.length ? body.insurance_branches : null,
      insurance_subbranches: body.insurance_subbranches?.length ? body.insurance_subbranches : null,
    };

    let tenantId: string;

    if (body.existingTenantId) {
      const { error: updateErr } = await supabase
        .from("propostaone_tenants")
        .update(tenantPayload)
        .eq("id", body.existingTenantId);
      if (updateErr) throw new Error(`Tenant update failed: ${updateErr.message}`);
      tenantId = body.existingTenantId;
    } else {
      const { data: newTenant, error: tenantErr } = await supabase
        .from("propostaone_tenants")
        .insert(tenantPayload)
        .select("id")
        .single();
      if (tenantErr) throw new Error(`Tenant create failed: ${tenantErr.message}`);
      tenantId = newTenant.id;
      createdTenantId = tenantId;
      tenantWasNew = true;
    }

    // ── STEP 2: Create auth user ──────────────────────────────────────────────
    const { data: authData, error: authErr } = await supabase.auth.admin.createUser({
      email: body.contactEmail,
      password: body.password,
      email_confirm: true,
      user_metadata: { full_name: body.fullName },
    });

    if (authErr) {
      if (tenantWasNew && createdTenantId) {
        await supabase.from("propostaone_tenants").delete().eq("id", createdTenantId);
      }
      throw new Error(`Auth create failed: ${authErr.message}`);
    }

    createdUserId = authData.user.id;

    // ── STEP 3: Create profile ────────────────────────────────────────────────
    const { error: profileErr } = await supabase.from("propostaone_profiles").insert({
      id: authData.user.id,
      tenant_id: tenantId,
      full_name: body.fullName,
      email: body.contactEmail,
      phone: body.whatsapp || null,
      role: "owner",
      active: true,
    });

    if (profileErr) {
      // Rollback
      await supabase.auth.admin.deleteUser(authData.user.id);
      if (tenantWasNew && createdTenantId) {
        await supabase.from("propostaone_tenants").delete().eq("id", createdTenantId);
      }
      throw new Error(`Profile create failed: ${profileErr.message}`);
    }

    return new Response(
      JSON.stringify({ success: true, tenantId }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    // Attempt rollback on unexpected errors
    if (createdUserId) {
      await supabase.auth.admin.deleteUser(createdUserId).catch(() => {});
    }
    if (createdTenantId && tenantWasNew) {
      await supabase.from("propostaone_tenants").delete().eq("id", createdTenantId).catch(() => {});
    }

    const msg = err instanceof Error ? err.message : "Erro interno";
    return new Response(
      JSON.stringify({ success: false, error: msg, code: "INTERNAL_ERROR" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
