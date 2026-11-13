/*
# PropostaOne — schema inicial (consolidado)

Gerado a partir das migrations originais do Bolt (CorretoraOne), com:
- prefixo propostaone_ em todas as tabelas, funções e índices
  (o banco é compartilhado com o Garantia de Receita, então nada pode colidir);
- módulo/agente de WhatsApp removido (corretora_agents, corretora_connections,
  corretora_agent_commands, corretora_agent_events, corretora_app_releases,
  update_notifications, client_update_acks e os buckets de releases);
- SECURITY DEFINER com search_path fixo;
- bucket de documentos privado e isolado por tenant.

Não cria triggers em auth.users: o perfil é criado pela edge function
propostaone-register, então cadastros do Garantia de Receita não são afetados.
*/

-- ════════════════════════════════════════════════════════════════
-- origem (Bolt): 20260627135756_create_core_tables.sql
-- ════════════════════════════════════════════════════════════════
/*
# CorretoraOne — Core Tables (Migration 1)

Creates the multi-tenant foundation: tenants, profiles, helper function, and supporting tables.
Tables are created in dependency order so forward references are avoided.

## New Tables
- `tenants`: each insurance broker account on the platform
- `profiles`: auth user extensions with tenant membership and role
- `teams`, `branches`, `team_members`: organizational structure within a tenant
- `module_permissions`: per-user per-module access flags
- `notifications`: per-user notification inbox

## Security
- RLS enabled on all tables
- `get_tenant_id()` SECURITY DEFINER function reads profiles bypassing RLS for safe use inside other policies
- Tenant isolation via tenant_id = get_tenant_id() on all non-auth tables
*/

-- ============================================================
-- TENANTS
-- ============================================================
CREATE TABLE IF NOT EXISTS propostaone_tenants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE,
  logo_url text,
  cnpj text,
  email text,
  phone text,
  address text,
  city text,
  state text,
  plan text NOT NULL DEFAULT 'starter' CHECK (plan IN ('free','starter','professional','enterprise')),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','suspended','cancelled')),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE propostaone_tenants ENABLE ROW LEVEL SECURITY;

-- Temporary open policies — will be tightened after profiles exist and get_tenant_id() is created
DROP POLICY IF EXISTS "tenant_insert" ON propostaone_tenants;
CREATE POLICY "tenant_insert" ON propostaone_tenants FOR INSERT
  TO authenticated WITH CHECK (true);

-- ============================================================
-- PROFILES (must exist before get_tenant_id())
-- ============================================================
CREATE TABLE IF NOT EXISTS propostaone_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id uuid REFERENCES propostaone_tenants(id) ON DELETE CASCADE,
  full_name text NOT NULL DEFAULT '',
  email text,
  phone text,
  avatar_url text,
  role text NOT NULL DEFAULT 'agent' CHECK (role IN ('owner','admin','manager','agent','viewer')),
  job_title text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE propostaone_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select" ON propostaone_profiles;
CREATE POLICY "profiles_select" ON propostaone_profiles FOR SELECT
  TO authenticated USING (
    id = auth.uid()
    OR tenant_id = (SELECT tenant_id FROM propostaone_profiles p2 WHERE p2.id = auth.uid())
  );

DROP POLICY IF EXISTS "profiles_insert" ON propostaone_profiles;
CREATE POLICY "profiles_insert" ON propostaone_profiles FOR INSERT
  TO authenticated WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS "profiles_update" ON propostaone_profiles;
CREATE POLICY "profiles_update" ON propostaone_profiles FOR UPDATE
  TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());

-- ============================================================
-- HELPER FUNCTION (depends on profiles existing)
-- ============================================================
CREATE OR REPLACE FUNCTION propostaone_get_tenant_id()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT tenant_id FROM propostaone_profiles WHERE id = auth.uid()
$$;

-- ============================================================
-- TIGHTEN TENANTS POLICIES (now that profiles + function exist)
-- ============================================================
DROP POLICY IF EXISTS "tenant_select" ON propostaone_tenants;
CREATE POLICY "tenant_select" ON propostaone_tenants FOR SELECT
  TO authenticated USING (id = propostaone_get_tenant_id());

DROP POLICY IF EXISTS "tenant_update" ON propostaone_tenants;
CREATE POLICY "tenant_update" ON propostaone_tenants FOR UPDATE
  TO authenticated USING (id = propostaone_get_tenant_id()) WITH CHECK (id = propostaone_get_tenant_id());

DROP POLICY IF EXISTS "tenant_delete" ON propostaone_tenants;
CREATE POLICY "tenant_delete" ON propostaone_tenants FOR DELETE
  TO authenticated USING (id = propostaone_get_tenant_id());

-- ============================================================
-- TEAMS
-- ============================================================
CREATE TABLE IF NOT EXISTS propostaone_teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL DEFAULT propostaone_get_tenant_id() REFERENCES propostaone_tenants(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  color text DEFAULT '#60a5fa',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE propostaone_teams ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "teams_select" ON propostaone_teams;
CREATE POLICY "teams_select" ON propostaone_teams FOR SELECT
  TO authenticated USING (tenant_id = propostaone_get_tenant_id());

DROP POLICY IF EXISTS "teams_insert" ON propostaone_teams;
CREATE POLICY "teams_insert" ON propostaone_teams FOR INSERT
  TO authenticated WITH CHECK (tenant_id = propostaone_get_tenant_id());

DROP POLICY IF EXISTS "teams_update" ON propostaone_teams;
CREATE POLICY "teams_update" ON propostaone_teams FOR UPDATE
  TO authenticated USING (tenant_id = propostaone_get_tenant_id()) WITH CHECK (tenant_id = propostaone_get_tenant_id());

DROP POLICY IF EXISTS "teams_delete" ON propostaone_teams;
CREATE POLICY "teams_delete" ON propostaone_teams FOR DELETE
  TO authenticated USING (tenant_id = propostaone_get_tenant_id());

-- ============================================================
-- BRANCHES
-- ============================================================
CREATE TABLE IF NOT EXISTS propostaone_branches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL DEFAULT propostaone_get_tenant_id() REFERENCES propostaone_tenants(id) ON DELETE CASCADE,
  name text NOT NULL,
  city text,
  state text,
  phone text,
  email text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE propostaone_branches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "branches_select" ON propostaone_branches;
CREATE POLICY "branches_select" ON propostaone_branches FOR SELECT
  TO authenticated USING (tenant_id = propostaone_get_tenant_id());

DROP POLICY IF EXISTS "branches_insert" ON propostaone_branches;
CREATE POLICY "branches_insert" ON propostaone_branches FOR INSERT
  TO authenticated WITH CHECK (tenant_id = propostaone_get_tenant_id());

DROP POLICY IF EXISTS "branches_update" ON propostaone_branches;
CREATE POLICY "branches_update" ON propostaone_branches FOR UPDATE
  TO authenticated USING (tenant_id = propostaone_get_tenant_id()) WITH CHECK (tenant_id = propostaone_get_tenant_id());

DROP POLICY IF EXISTS "branches_delete" ON propostaone_branches;
CREATE POLICY "branches_delete" ON propostaone_branches FOR DELETE
  TO authenticated USING (tenant_id = propostaone_get_tenant_id());

-- ============================================================
-- TEAM MEMBERS
-- ============================================================
CREATE TABLE IF NOT EXISTS propostaone_team_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL DEFAULT propostaone_get_tenant_id() REFERENCES propostaone_tenants(id) ON DELETE CASCADE,
  team_id uuid NOT NULL REFERENCES propostaone_teams(id) ON DELETE CASCADE,
  profile_id uuid NOT NULL REFERENCES propostaone_profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(team_id, profile_id)
);

ALTER TABLE propostaone_team_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "team_members_select" ON propostaone_team_members;
CREATE POLICY "team_members_select" ON propostaone_team_members FOR SELECT
  TO authenticated USING (tenant_id = propostaone_get_tenant_id());

DROP POLICY IF EXISTS "team_members_insert" ON propostaone_team_members;
CREATE POLICY "team_members_insert" ON propostaone_team_members FOR INSERT
  TO authenticated WITH CHECK (tenant_id = propostaone_get_tenant_id());

DROP POLICY IF EXISTS "team_members_delete" ON propostaone_team_members;
CREATE POLICY "team_members_delete" ON propostaone_team_members FOR DELETE
  TO authenticated USING (tenant_id = propostaone_get_tenant_id());

-- ============================================================
-- MODULE PERMISSIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS propostaone_module_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL DEFAULT propostaone_get_tenant_id() REFERENCES propostaone_tenants(id) ON DELETE CASCADE,
  profile_id uuid NOT NULL REFERENCES propostaone_profiles(id) ON DELETE CASCADE,
  module text NOT NULL,
  can_read boolean NOT NULL DEFAULT true,
  can_write boolean NOT NULL DEFAULT false,
  can_delete boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now(),
  UNIQUE(profile_id, module)
);

ALTER TABLE propostaone_module_permissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "module_permissions_select" ON propostaone_module_permissions;
CREATE POLICY "module_permissions_select" ON propostaone_module_permissions FOR SELECT
  TO authenticated USING (tenant_id = propostaone_get_tenant_id());

DROP POLICY IF EXISTS "module_permissions_insert" ON propostaone_module_permissions;
CREATE POLICY "module_permissions_insert" ON propostaone_module_permissions FOR INSERT
  TO authenticated WITH CHECK (tenant_id = propostaone_get_tenant_id());

DROP POLICY IF EXISTS "module_permissions_update" ON propostaone_module_permissions;
CREATE POLICY "module_permissions_update" ON propostaone_module_permissions FOR UPDATE
  TO authenticated USING (tenant_id = propostaone_get_tenant_id()) WITH CHECK (tenant_id = propostaone_get_tenant_id());

DROP POLICY IF EXISTS "module_permissions_delete" ON propostaone_module_permissions;
CREATE POLICY "module_permissions_delete" ON propostaone_module_permissions FOR DELETE
  TO authenticated USING (tenant_id = propostaone_get_tenant_id());

-- ============================================================
-- NOTIFICATIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS propostaone_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL DEFAULT propostaone_get_tenant_id() REFERENCES propostaone_tenants(id) ON DELETE CASCADE,
  profile_id uuid NOT NULL REFERENCES propostaone_profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  body text,
  type text NOT NULL DEFAULT 'info' CHECK (type IN ('info','success','warning','error','renewal','task')),
  read boolean NOT NULL DEFAULT false,
  link text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE propostaone_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notifications_select" ON propostaone_notifications;
CREATE POLICY "notifications_select" ON propostaone_notifications FOR SELECT
  TO authenticated USING (profile_id = auth.uid());

DROP POLICY IF EXISTS "notifications_insert" ON propostaone_notifications;
CREATE POLICY "notifications_insert" ON propostaone_notifications FOR INSERT
  TO authenticated WITH CHECK (tenant_id = propostaone_get_tenant_id());

DROP POLICY IF EXISTS "notifications_update" ON propostaone_notifications;
CREATE POLICY "notifications_update" ON propostaone_notifications FOR UPDATE
  TO authenticated USING (profile_id = auth.uid()) WITH CHECK (profile_id = auth.uid());

DROP POLICY IF EXISTS "notifications_delete" ON propostaone_notifications;
CREATE POLICY "notifications_delete" ON propostaone_notifications FOR DELETE
  TO authenticated USING (profile_id = auth.uid());

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_propostaone_profiles_tenant ON propostaone_profiles(tenant_id);
CREATE INDEX IF NOT EXISTS idx_propostaone_teams_tenant ON propostaone_teams(tenant_id);
CREATE INDEX IF NOT EXISTS idx_propostaone_branches_tenant ON propostaone_branches(tenant_id);
CREATE INDEX IF NOT EXISTS idx_propostaone_notifications_profile ON propostaone_notifications(profile_id, read);


-- ════════════════════════════════════════════════════════════════
-- origem (Bolt): 20260627135843_create_crm_tables.sql
-- ════════════════════════════════════════════════════════════════
/*
# CorretoraOne — CRM Tables (Migration 2)

## Summary
Creates all customer relationship management tables for the platform.

## New Tables
- `companies`: business entities (empresas) — B2B clients
- `clients`: individual clients with full contact data
- `leads`: prospects not yet converted to clients
- `contacts`: additional contacts linked to a client or company
- `client_tags`: tagging system for clients/leads
- `client_notes`: free-text notes with author tracking
- `client_files`: file attachment metadata (actual files in Supabase Storage)
- `client_timeline`: chronological activity feed per client
- `custom_fields`: per-tenant custom field definitions
- `custom_field_values`: values for custom fields on any entity

## Security
- RLS on all tables, scoped to tenant via get_tenant_id()
- 4 separate policies per table (SELECT / INSERT / UPDATE / DELETE)
*/

-- ============================================================
-- COMPANIES
-- ============================================================
CREATE TABLE IF NOT EXISTS propostaone_companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL DEFAULT propostaone_get_tenant_id() REFERENCES propostaone_tenants(id) ON DELETE CASCADE,
  name text NOT NULL,
  cnpj text,
  email text,
  phone text,
  website text,
  address text,
  city text,
  state text,
  segment text,
  employees_count int,
  annual_revenue numeric,
  notes text,
  active boolean NOT NULL DEFAULT true,
  assigned_to uuid REFERENCES propostaone_profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE propostaone_companies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "companies_select" ON propostaone_companies;
CREATE POLICY "companies_select" ON propostaone_companies FOR SELECT TO authenticated USING (tenant_id = propostaone_get_tenant_id());
DROP POLICY IF EXISTS "companies_insert" ON propostaone_companies;
CREATE POLICY "companies_insert" ON propostaone_companies FOR INSERT TO authenticated WITH CHECK (tenant_id = propostaone_get_tenant_id());
DROP POLICY IF EXISTS "companies_update" ON propostaone_companies;
CREATE POLICY "companies_update" ON propostaone_companies FOR UPDATE TO authenticated USING (tenant_id = propostaone_get_tenant_id()) WITH CHECK (tenant_id = propostaone_get_tenant_id());
DROP POLICY IF EXISTS "companies_delete" ON propostaone_companies;
CREATE POLICY "companies_delete" ON propostaone_companies FOR DELETE TO authenticated USING (tenant_id = propostaone_get_tenant_id());

-- ============================================================
-- CLIENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS propostaone_clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL DEFAULT propostaone_get_tenant_id() REFERENCES propostaone_tenants(id) ON DELETE CASCADE,
  type text NOT NULL DEFAULT 'individual' CHECK (type IN ('individual','company')),
  full_name text NOT NULL,
  cpf_cnpj text,
  email text,
  phone text,
  phone2 text,
  birth_date date,
  gender text CHECK (gender IN ('M','F','other')),
  profession text,
  marital_status text,
  address text,
  address_number text,
  address_complement text,
  neighborhood text,
  city text,
  state text,
  zip_code text,
  company_id uuid REFERENCES propostaone_companies(id),
  assigned_to uuid REFERENCES propostaone_profiles(id),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive','prospect')),
  origin text,
  notes text,
  avatar_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE propostaone_clients ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "clients_select" ON propostaone_clients;
CREATE POLICY "clients_select" ON propostaone_clients FOR SELECT TO authenticated USING (tenant_id = propostaone_get_tenant_id());
DROP POLICY IF EXISTS "clients_insert" ON propostaone_clients;
CREATE POLICY "clients_insert" ON propostaone_clients FOR INSERT TO authenticated WITH CHECK (tenant_id = propostaone_get_tenant_id());
DROP POLICY IF EXISTS "clients_update" ON propostaone_clients;
CREATE POLICY "clients_update" ON propostaone_clients FOR UPDATE TO authenticated USING (tenant_id = propostaone_get_tenant_id()) WITH CHECK (tenant_id = propostaone_get_tenant_id());
DROP POLICY IF EXISTS "clients_delete" ON propostaone_clients;
CREATE POLICY "clients_delete" ON propostaone_clients FOR DELETE TO authenticated USING (tenant_id = propostaone_get_tenant_id());

-- ============================================================
-- LEADS
-- ============================================================
CREATE TABLE IF NOT EXISTS propostaone_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL DEFAULT propostaone_get_tenant_id() REFERENCES propostaone_tenants(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  email text,
  phone text,
  company text,
  interest text,
  origin text,
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new','contacted','qualified','unqualified','converted')),
  score int DEFAULT 0,
  assigned_to uuid REFERENCES propostaone_profiles(id),
  converted_to uuid REFERENCES propostaone_clients(id),
  converted_at timestamptz,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE propostaone_leads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "leads_select" ON propostaone_leads;
CREATE POLICY "leads_select" ON propostaone_leads FOR SELECT TO authenticated USING (tenant_id = propostaone_get_tenant_id());
DROP POLICY IF EXISTS "leads_insert" ON propostaone_leads;
CREATE POLICY "leads_insert" ON propostaone_leads FOR INSERT TO authenticated WITH CHECK (tenant_id = propostaone_get_tenant_id());
DROP POLICY IF EXISTS "leads_update" ON propostaone_leads;
CREATE POLICY "leads_update" ON propostaone_leads FOR UPDATE TO authenticated USING (tenant_id = propostaone_get_tenant_id()) WITH CHECK (tenant_id = propostaone_get_tenant_id());
DROP POLICY IF EXISTS "leads_delete" ON propostaone_leads;
CREATE POLICY "leads_delete" ON propostaone_leads FOR DELETE TO authenticated USING (tenant_id = propostaone_get_tenant_id());

-- ============================================================
-- CONTACTS
-- ============================================================
CREATE TABLE IF NOT EXISTS propostaone_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL DEFAULT propostaone_get_tenant_id() REFERENCES propostaone_tenants(id) ON DELETE CASCADE,
  client_id uuid REFERENCES propostaone_clients(id) ON DELETE CASCADE,
  company_id uuid REFERENCES propostaone_companies(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  email text,
  phone text,
  role text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE propostaone_contacts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "contacts_select" ON propostaone_contacts;
CREATE POLICY "contacts_select" ON propostaone_contacts FOR SELECT TO authenticated USING (tenant_id = propostaone_get_tenant_id());
DROP POLICY IF EXISTS "contacts_insert" ON propostaone_contacts;
CREATE POLICY "contacts_insert" ON propostaone_contacts FOR INSERT TO authenticated WITH CHECK (tenant_id = propostaone_get_tenant_id());
DROP POLICY IF EXISTS "contacts_update" ON propostaone_contacts;
CREATE POLICY "contacts_update" ON propostaone_contacts FOR UPDATE TO authenticated USING (tenant_id = propostaone_get_tenant_id()) WITH CHECK (tenant_id = propostaone_get_tenant_id());
DROP POLICY IF EXISTS "contacts_delete" ON propostaone_contacts;
CREATE POLICY "contacts_delete" ON propostaone_contacts FOR DELETE TO authenticated USING (tenant_id = propostaone_get_tenant_id());

-- ============================================================
-- CLIENT TAGS
-- ============================================================
CREATE TABLE IF NOT EXISTS propostaone_client_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL DEFAULT propostaone_get_tenant_id() REFERENCES propostaone_tenants(id) ON DELETE CASCADE,
  client_id uuid REFERENCES propostaone_clients(id) ON DELETE CASCADE,
  lead_id uuid REFERENCES propostaone_leads(id) ON DELETE CASCADE,
  tag text NOT NULL,
  color text DEFAULT '#60a5fa',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE propostaone_client_tags ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "client_tags_select" ON propostaone_client_tags;
CREATE POLICY "client_tags_select" ON propostaone_client_tags FOR SELECT TO authenticated USING (tenant_id = propostaone_get_tenant_id());
DROP POLICY IF EXISTS "client_tags_insert" ON propostaone_client_tags;
CREATE POLICY "client_tags_insert" ON propostaone_client_tags FOR INSERT TO authenticated WITH CHECK (tenant_id = propostaone_get_tenant_id());
DROP POLICY IF EXISTS "client_tags_delete" ON propostaone_client_tags;
CREATE POLICY "client_tags_delete" ON propostaone_client_tags FOR DELETE TO authenticated USING (tenant_id = propostaone_get_tenant_id());

-- ============================================================
-- CLIENT NOTES
-- ============================================================
CREATE TABLE IF NOT EXISTS propostaone_client_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL DEFAULT propostaone_get_tenant_id() REFERENCES propostaone_tenants(id) ON DELETE CASCADE,
  client_id uuid REFERENCES propostaone_clients(id) ON DELETE CASCADE,
  lead_id uuid REFERENCES propostaone_leads(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES propostaone_profiles(id),
  content text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE propostaone_client_notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "client_notes_select" ON propostaone_client_notes;
CREATE POLICY "client_notes_select" ON propostaone_client_notes FOR SELECT TO authenticated USING (tenant_id = propostaone_get_tenant_id());
DROP POLICY IF EXISTS "client_notes_insert" ON propostaone_client_notes;
CREATE POLICY "client_notes_insert" ON propostaone_client_notes FOR INSERT TO authenticated WITH CHECK (tenant_id = propostaone_get_tenant_id());
DROP POLICY IF EXISTS "client_notes_delete" ON propostaone_client_notes;
CREATE POLICY "client_notes_delete" ON propostaone_client_notes FOR DELETE TO authenticated USING (tenant_id = propostaone_get_tenant_id());

-- ============================================================
-- CLIENT FILES
-- ============================================================
CREATE TABLE IF NOT EXISTS propostaone_client_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL DEFAULT propostaone_get_tenant_id() REFERENCES propostaone_tenants(id) ON DELETE CASCADE,
  client_id uuid REFERENCES propostaone_clients(id) ON DELETE CASCADE,
  lead_id uuid REFERENCES propostaone_leads(id) ON DELETE CASCADE,
  name text NOT NULL,
  file_path text NOT NULL,
  file_size bigint,
  mime_type text,
  uploaded_by uuid REFERENCES propostaone_profiles(id),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE propostaone_client_files ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "client_files_select" ON propostaone_client_files;
CREATE POLICY "client_files_select" ON propostaone_client_files FOR SELECT TO authenticated USING (tenant_id = propostaone_get_tenant_id());
DROP POLICY IF EXISTS "client_files_insert" ON propostaone_client_files;
CREATE POLICY "client_files_insert" ON propostaone_client_files FOR INSERT TO authenticated WITH CHECK (tenant_id = propostaone_get_tenant_id());
DROP POLICY IF EXISTS "client_files_delete" ON propostaone_client_files;
CREATE POLICY "client_files_delete" ON propostaone_client_files FOR DELETE TO authenticated USING (tenant_id = propostaone_get_tenant_id());

-- ============================================================
-- CLIENT TIMELINE
-- ============================================================
CREATE TABLE IF NOT EXISTS propostaone_client_timeline (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL DEFAULT propostaone_get_tenant_id() REFERENCES propostaone_tenants(id) ON DELETE CASCADE,
  client_id uuid REFERENCES propostaone_clients(id) ON DELETE CASCADE,
  lead_id uuid REFERENCES propostaone_leads(id) ON DELETE CASCADE,
  actor_id uuid REFERENCES propostaone_profiles(id),
  event_type text NOT NULL,
  description text NOT NULL,
  metadata jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE propostaone_client_timeline ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "client_timeline_select" ON propostaone_client_timeline;
CREATE POLICY "client_timeline_select" ON propostaone_client_timeline FOR SELECT TO authenticated USING (tenant_id = propostaone_get_tenant_id());
DROP POLICY IF EXISTS "client_timeline_insert" ON propostaone_client_timeline;
CREATE POLICY "client_timeline_insert" ON propostaone_client_timeline FOR INSERT TO authenticated WITH CHECK (tenant_id = propostaone_get_tenant_id());

-- ============================================================
-- CUSTOM FIELDS
-- ============================================================
CREATE TABLE IF NOT EXISTS propostaone_custom_fields (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL DEFAULT propostaone_get_tenant_id() REFERENCES propostaone_tenants(id) ON DELETE CASCADE,
  entity text NOT NULL CHECK (entity IN ('client','lead','company','policy','opportunity')),
  name text NOT NULL,
  label text NOT NULL,
  field_type text NOT NULL CHECK (field_type IN ('text','number','date','boolean','select','multiselect')),
  options jsonb,
  required boolean NOT NULL DEFAULT false,
  sort_order int DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE propostaone_custom_fields ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "custom_fields_select" ON propostaone_custom_fields;
CREATE POLICY "custom_fields_select" ON propostaone_custom_fields FOR SELECT TO authenticated USING (tenant_id = propostaone_get_tenant_id());
DROP POLICY IF EXISTS "custom_fields_insert" ON propostaone_custom_fields;
CREATE POLICY "custom_fields_insert" ON propostaone_custom_fields FOR INSERT TO authenticated WITH CHECK (tenant_id = propostaone_get_tenant_id());
DROP POLICY IF EXISTS "custom_fields_update" ON propostaone_custom_fields;
CREATE POLICY "custom_fields_update" ON propostaone_custom_fields FOR UPDATE TO authenticated USING (tenant_id = propostaone_get_tenant_id()) WITH CHECK (tenant_id = propostaone_get_tenant_id());
DROP POLICY IF EXISTS "custom_fields_delete" ON propostaone_custom_fields;
CREATE POLICY "custom_fields_delete" ON propostaone_custom_fields FOR DELETE TO authenticated USING (tenant_id = propostaone_get_tenant_id());

-- INDEXES
CREATE INDEX IF NOT EXISTS idx_propostaone_clients_tenant ON propostaone_clients(tenant_id);
CREATE INDEX IF NOT EXISTS idx_propostaone_leads_tenant ON propostaone_leads(tenant_id);
CREATE INDEX IF NOT EXISTS idx_propostaone_companies_tenant ON propostaone_companies(tenant_id);
CREATE INDEX IF NOT EXISTS idx_propostaone_client_timeline_client ON propostaone_client_timeline(client_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_propostaone_clients_assigned ON propostaone_clients(assigned_to);
CREATE INDEX IF NOT EXISTS idx_propostaone_leads_status ON propostaone_leads(tenant_id, status);


-- ════════════════════════════════════════════════════════════════
-- origem (Bolt): 20260627135926_create_commercial_agenda_policies_tables.sql
-- ════════════════════════════════════════════════════════════════
/*
# CorretoraOne — Commercial Pipeline + Agenda + Policies Tables (Migration 3)

## Summary
Creates tables for the commercial pipeline (Kanban), agenda (calendar), 
and insurance policy management.

## New Tables

### Commercial Pipeline
- `pipelines`: named sales pipelines per tenant
- `pipeline_stages`: configurable stages within a pipeline
- `opportunities`: individual deals with status, value, probability

### Agenda
- `events`: all calendar items (appointments, visits, calls, renewals, tasks)

### Policies
- `insurers`: insurance companies (seguradoras) catalog per tenant
- `insurance_products`: products offered by each insurer
- `policies`: insurance policies (apólices) with full lifecycle
- `policy_endorsements`: policy amendments (endossos)
- `policy_claims`: sinistros (claims) linked to policies

## Security
- RLS on all tables, tenant-scoped via get_tenant_id()
*/

-- ============================================================
-- PIPELINES
-- ============================================================
CREATE TABLE IF NOT EXISTS propostaone_pipelines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL DEFAULT propostaone_get_tenant_id() REFERENCES propostaone_tenants(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE propostaone_pipelines ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pipelines_select" ON propostaone_pipelines;
CREATE POLICY "pipelines_select" ON propostaone_pipelines FOR SELECT TO authenticated USING (tenant_id = propostaone_get_tenant_id());
DROP POLICY IF EXISTS "pipelines_insert" ON propostaone_pipelines;
CREATE POLICY "pipelines_insert" ON propostaone_pipelines FOR INSERT TO authenticated WITH CHECK (tenant_id = propostaone_get_tenant_id());
DROP POLICY IF EXISTS "pipelines_update" ON propostaone_pipelines;
CREATE POLICY "pipelines_update" ON propostaone_pipelines FOR UPDATE TO authenticated USING (tenant_id = propostaone_get_tenant_id()) WITH CHECK (tenant_id = propostaone_get_tenant_id());
DROP POLICY IF EXISTS "pipelines_delete" ON propostaone_pipelines;
CREATE POLICY "pipelines_delete" ON propostaone_pipelines FOR DELETE TO authenticated USING (tenant_id = propostaone_get_tenant_id());

-- ============================================================
-- PIPELINE STAGES
-- ============================================================
CREATE TABLE IF NOT EXISTS propostaone_pipeline_stages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL DEFAULT propostaone_get_tenant_id() REFERENCES propostaone_tenants(id) ON DELETE CASCADE,
  pipeline_id uuid NOT NULL REFERENCES propostaone_pipelines(id) ON DELETE CASCADE,
  name text NOT NULL,
  color text DEFAULT '#60a5fa',
  sort_order int NOT NULL DEFAULT 0,
  probability int DEFAULT 50 CHECK (probability >= 0 AND probability <= 100),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE propostaone_pipeline_stages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pipeline_stages_select" ON propostaone_pipeline_stages;
CREATE POLICY "pipeline_stages_select" ON propostaone_pipeline_stages FOR SELECT TO authenticated USING (tenant_id = propostaone_get_tenant_id());
DROP POLICY IF EXISTS "pipeline_stages_insert" ON propostaone_pipeline_stages;
CREATE POLICY "pipeline_stages_insert" ON propostaone_pipeline_stages FOR INSERT TO authenticated WITH CHECK (tenant_id = propostaone_get_tenant_id());
DROP POLICY IF EXISTS "pipeline_stages_update" ON propostaone_pipeline_stages;
CREATE POLICY "pipeline_stages_update" ON propostaone_pipeline_stages FOR UPDATE TO authenticated USING (tenant_id = propostaone_get_tenant_id()) WITH CHECK (tenant_id = propostaone_get_tenant_id());
DROP POLICY IF EXISTS "pipeline_stages_delete" ON propostaone_pipeline_stages;
CREATE POLICY "pipeline_stages_delete" ON propostaone_pipeline_stages FOR DELETE TO authenticated USING (tenant_id = propostaone_get_tenant_id());

-- ============================================================
-- OPPORTUNITIES
-- ============================================================
CREATE TABLE IF NOT EXISTS propostaone_opportunities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL DEFAULT propostaone_get_tenant_id() REFERENCES propostaone_tenants(id) ON DELETE CASCADE,
  pipeline_id uuid NOT NULL REFERENCES propostaone_pipelines(id),
  stage_id uuid NOT NULL REFERENCES propostaone_pipeline_stages(id),
  title text NOT NULL,
  client_id uuid REFERENCES propostaone_clients(id),
  lead_id uuid REFERENCES propostaone_leads(id),
  assigned_to uuid REFERENCES propostaone_profiles(id),
  value numeric DEFAULT 0,
  probability int DEFAULT 50 CHECK (probability >= 0 AND probability <= 100),
  expected_close date,
  origin text,
  product_type text,
  insurer text,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','won','lost','paused')),
  lost_reason text,
  notes text,
  sort_order int DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE propostaone_opportunities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "opportunities_select" ON propostaone_opportunities;
CREATE POLICY "opportunities_select" ON propostaone_opportunities FOR SELECT TO authenticated USING (tenant_id = propostaone_get_tenant_id());
DROP POLICY IF EXISTS "opportunities_insert" ON propostaone_opportunities;
CREATE POLICY "opportunities_insert" ON propostaone_opportunities FOR INSERT TO authenticated WITH CHECK (tenant_id = propostaone_get_tenant_id());
DROP POLICY IF EXISTS "opportunities_update" ON propostaone_opportunities;
CREATE POLICY "opportunities_update" ON propostaone_opportunities FOR UPDATE TO authenticated USING (tenant_id = propostaone_get_tenant_id()) WITH CHECK (tenant_id = propostaone_get_tenant_id());
DROP POLICY IF EXISTS "opportunities_delete" ON propostaone_opportunities;
CREATE POLICY "opportunities_delete" ON propostaone_opportunities FOR DELETE TO authenticated USING (tenant_id = propostaone_get_tenant_id());

-- ============================================================
-- EVENTS (AGENDA)
-- ============================================================
CREATE TABLE IF NOT EXISTS propostaone_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL DEFAULT propostaone_get_tenant_id() REFERENCES propostaone_tenants(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  type text NOT NULL DEFAULT 'appointment' CHECK (type IN ('appointment','visit','call','renewal','task','other')),
  start_at timestamptz NOT NULL,
  end_at timestamptz,
  all_day boolean NOT NULL DEFAULT false,
  location text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','completed','cancelled','no_show')),
  priority text NOT NULL DEFAULT 'normal' CHECK (priority IN ('low','normal','high','urgent')),
  client_id uuid REFERENCES propostaone_clients(id),
  lead_id uuid REFERENCES propostaone_leads(id),
  opportunity_id uuid REFERENCES propostaone_opportunities(id),
  assigned_to uuid REFERENCES propostaone_profiles(id),
  reminder_minutes int,
  recurrence text,
  google_event_id text,
  created_by uuid REFERENCES propostaone_profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE propostaone_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "events_select" ON propostaone_events;
CREATE POLICY "events_select" ON propostaone_events FOR SELECT TO authenticated USING (tenant_id = propostaone_get_tenant_id());
DROP POLICY IF EXISTS "events_insert" ON propostaone_events;
CREATE POLICY "events_insert" ON propostaone_events FOR INSERT TO authenticated WITH CHECK (tenant_id = propostaone_get_tenant_id());
DROP POLICY IF EXISTS "events_update" ON propostaone_events;
CREATE POLICY "events_update" ON propostaone_events FOR UPDATE TO authenticated USING (tenant_id = propostaone_get_tenant_id()) WITH CHECK (tenant_id = propostaone_get_tenant_id());
DROP POLICY IF EXISTS "events_delete" ON propostaone_events;
CREATE POLICY "events_delete" ON propostaone_events FOR DELETE TO authenticated USING (tenant_id = propostaone_get_tenant_id());

-- ============================================================
-- INSURERS (SEGURADORAS)
-- ============================================================
CREATE TABLE IF NOT EXISTS propostaone_insurers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL DEFAULT propostaone_get_tenant_id() REFERENCES propostaone_tenants(id) ON DELETE CASCADE,
  name text NOT NULL,
  cnpj text,
  logo_url text,
  contact_email text,
  contact_phone text,
  website text,
  susep_code text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE propostaone_insurers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "insurers_select" ON propostaone_insurers;
CREATE POLICY "insurers_select" ON propostaone_insurers FOR SELECT TO authenticated USING (tenant_id = propostaone_get_tenant_id());
DROP POLICY IF EXISTS "insurers_insert" ON propostaone_insurers;
CREATE POLICY "insurers_insert" ON propostaone_insurers FOR INSERT TO authenticated WITH CHECK (tenant_id = propostaone_get_tenant_id());
DROP POLICY IF EXISTS "insurers_update" ON propostaone_insurers;
CREATE POLICY "insurers_update" ON propostaone_insurers FOR UPDATE TO authenticated USING (tenant_id = propostaone_get_tenant_id()) WITH CHECK (tenant_id = propostaone_get_tenant_id());
DROP POLICY IF EXISTS "insurers_delete" ON propostaone_insurers;
CREATE POLICY "insurers_delete" ON propostaone_insurers FOR DELETE TO authenticated USING (tenant_id = propostaone_get_tenant_id());

-- ============================================================
-- INSURANCE PRODUCTS
-- ============================================================
CREATE TABLE IF NOT EXISTS propostaone_insurance_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL DEFAULT propostaone_get_tenant_id() REFERENCES propostaone_tenants(id) ON DELETE CASCADE,
  insurer_id uuid REFERENCES propostaone_insurers(id) ON DELETE CASCADE,
  name text NOT NULL,
  category text NOT NULL CHECK (category IN ('auto','life','health','property','business','rural','transport','liability','other')),
  description text,
  commission_rate numeric DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE propostaone_insurance_products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "insurance_products_select" ON propostaone_insurance_products;
CREATE POLICY "insurance_products_select" ON propostaone_insurance_products FOR SELECT TO authenticated USING (tenant_id = propostaone_get_tenant_id());
DROP POLICY IF EXISTS "insurance_products_insert" ON propostaone_insurance_products;
CREATE POLICY "insurance_products_insert" ON propostaone_insurance_products FOR INSERT TO authenticated WITH CHECK (tenant_id = propostaone_get_tenant_id());
DROP POLICY IF EXISTS "insurance_products_update" ON propostaone_insurance_products;
CREATE POLICY "insurance_products_update" ON propostaone_insurance_products FOR UPDATE TO authenticated USING (tenant_id = propostaone_get_tenant_id()) WITH CHECK (tenant_id = propostaone_get_tenant_id());
DROP POLICY IF EXISTS "insurance_products_delete" ON propostaone_insurance_products;
CREATE POLICY "insurance_products_delete" ON propostaone_insurance_products FOR DELETE TO authenticated USING (tenant_id = propostaone_get_tenant_id());

-- ============================================================
-- POLICIES (APÓLICES)
-- ============================================================
CREATE TABLE IF NOT EXISTS propostaone_policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL DEFAULT propostaone_get_tenant_id() REFERENCES propostaone_tenants(id) ON DELETE CASCADE,
  policy_number text,
  client_id uuid NOT NULL REFERENCES propostaone_clients(id),
  insurer_id uuid REFERENCES propostaone_insurers(id),
  product_id uuid REFERENCES propostaone_insurance_products(id),
  assigned_to uuid REFERENCES propostaone_profiles(id),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('proposal','active','renewed','cancelled','expired','suspended')),
  category text NOT NULL DEFAULT 'other' CHECK (category IN ('auto','life','health','property','business','rural','transport','liability','other')),
  start_date date NOT NULL,
  end_date date NOT NULL,
  premium numeric NOT NULL DEFAULT 0,
  insured_value numeric,
  installments int DEFAULT 1,
  payment_method text,
  commission_rate numeric DEFAULT 0,
  commission_value numeric DEFAULT 0,
  insured_object text,
  insured_cpf_cnpj text,
  notes text,
  proposal_date date,
  emission_date date,
  renewed_from uuid REFERENCES propostaone_policies(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE propostaone_policies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "policies_select" ON propostaone_policies;
CREATE POLICY "policies_select" ON propostaone_policies FOR SELECT TO authenticated USING (tenant_id = propostaone_get_tenant_id());
DROP POLICY IF EXISTS "policies_insert" ON propostaone_policies;
CREATE POLICY "policies_insert" ON propostaone_policies FOR INSERT TO authenticated WITH CHECK (tenant_id = propostaone_get_tenant_id());
DROP POLICY IF EXISTS "policies_update" ON propostaone_policies;
CREATE POLICY "policies_update" ON propostaone_policies FOR UPDATE TO authenticated USING (tenant_id = propostaone_get_tenant_id()) WITH CHECK (tenant_id = propostaone_get_tenant_id());
DROP POLICY IF EXISTS "policies_delete" ON propostaone_policies;
CREATE POLICY "policies_delete" ON propostaone_policies FOR DELETE TO authenticated USING (tenant_id = propostaone_get_tenant_id());

-- ============================================================
-- POLICY ENDORSEMENTS (ENDOSSOS)
-- ============================================================
CREATE TABLE IF NOT EXISTS propostaone_policy_endorsements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL DEFAULT propostaone_get_tenant_id() REFERENCES propostaone_tenants(id) ON DELETE CASCADE,
  policy_id uuid NOT NULL REFERENCES propostaone_policies(id) ON DELETE CASCADE,
  endorsement_number text,
  type text NOT NULL,
  description text NOT NULL,
  effective_date date NOT NULL,
  value_change numeric DEFAULT 0,
  premium_change numeric DEFAULT 0,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  created_by uuid REFERENCES propostaone_profiles(id),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE propostaone_policy_endorsements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "policy_endorsements_select" ON propostaone_policy_endorsements;
CREATE POLICY "policy_endorsements_select" ON propostaone_policy_endorsements FOR SELECT TO authenticated USING (tenant_id = propostaone_get_tenant_id());
DROP POLICY IF EXISTS "policy_endorsements_insert" ON propostaone_policy_endorsements;
CREATE POLICY "policy_endorsements_insert" ON propostaone_policy_endorsements FOR INSERT TO authenticated WITH CHECK (tenant_id = propostaone_get_tenant_id());
DROP POLICY IF EXISTS "policy_endorsements_update" ON propostaone_policy_endorsements;
CREATE POLICY "policy_endorsements_update" ON propostaone_policy_endorsements FOR UPDATE TO authenticated USING (tenant_id = propostaone_get_tenant_id()) WITH CHECK (tenant_id = propostaone_get_tenant_id());
DROP POLICY IF EXISTS "policy_endorsements_delete" ON propostaone_policy_endorsements;
CREATE POLICY "policy_endorsements_delete" ON propostaone_policy_endorsements FOR DELETE TO authenticated USING (tenant_id = propostaone_get_tenant_id());

-- ============================================================
-- POLICY CLAIMS (SINISTROS)
-- ============================================================
CREATE TABLE IF NOT EXISTS propostaone_policy_claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL DEFAULT propostaone_get_tenant_id() REFERENCES propostaone_tenants(id) ON DELETE CASCADE,
  policy_id uuid NOT NULL REFERENCES propostaone_policies(id) ON DELETE CASCADE,
  claim_number text,
  occurrence_date date NOT NULL,
  reported_date date,
  description text NOT NULL,
  claim_value numeric,
  paid_value numeric,
  status text NOT NULL DEFAULT 'opened' CHECK (status IN ('opened','in_analysis','approved','paid','denied','closed')),
  insurer_contact text,
  notes text,
  created_by uuid REFERENCES propostaone_profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE propostaone_policy_claims ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "policy_claims_select" ON propostaone_policy_claims;
CREATE POLICY "policy_claims_select" ON propostaone_policy_claims FOR SELECT TO authenticated USING (tenant_id = propostaone_get_tenant_id());
DROP POLICY IF EXISTS "policy_claims_insert" ON propostaone_policy_claims;
CREATE POLICY "policy_claims_insert" ON propostaone_policy_claims FOR INSERT TO authenticated WITH CHECK (tenant_id = propostaone_get_tenant_id());
DROP POLICY IF EXISTS "policy_claims_update" ON propostaone_policy_claims;
CREATE POLICY "policy_claims_update" ON propostaone_policy_claims FOR UPDATE TO authenticated USING (tenant_id = propostaone_get_tenant_id()) WITH CHECK (tenant_id = propostaone_get_tenant_id());
DROP POLICY IF EXISTS "policy_claims_delete" ON propostaone_policy_claims;
CREATE POLICY "policy_claims_delete" ON propostaone_policy_claims FOR DELETE TO authenticated USING (tenant_id = propostaone_get_tenant_id());

-- INDEXES
CREATE INDEX IF NOT EXISTS idx_propostaone_opportunities_stage ON propostaone_opportunities(stage_id);
CREATE INDEX IF NOT EXISTS idx_propostaone_opportunities_tenant ON propostaone_opportunities(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_propostaone_events_tenant_start ON propostaone_events(tenant_id, start_at);
CREATE INDEX IF NOT EXISTS idx_propostaone_policies_tenant ON propostaone_policies(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_propostaone_policies_client ON propostaone_policies(client_id);
CREATE INDEX IF NOT EXISTS idx_propostaone_policies_end_date ON propostaone_policies(end_date);


-- ════════════════════════════════════════════════════════════════
-- origem (Bolt): 20260627140027_create_financial_comms_automations_marketplace.sql
-- ════════════════════════════════════════════════════════════════
/*
# CorretoraOne — Financial, Documents, Communication, Automations, Marketplace (Migration 4)

## Summary
Creates all remaining domain tables: financial management, document storage,
communication history, automation engine, and insurer marketplace.

## New Tables

### Financial
- `commissions`: commission records linked to policies
- `receivables`: amounts receivable from insurers
- `installments`: individual payment installments per policy
- `financial_transactions`: general ledger of all money movement
- `transfers`: repasses to producers/agents

### Documents
- `document_folders`: virtual folder hierarchy per tenant
- `documents`: file metadata (binary in Supabase Storage)

### Communication
- `message_templates`: reusable message templates with variables
- `communication_history`: sent message log per client

### Automations
- `automations`: automation rule definitions
- `automation_logs`: execution history

### Marketplace
- `insurer_connectors`: global catalog of available insurer integrations
- `tenant_integrations`: per-tenant configured integrations with encrypted credentials
- `integration_logs`: API call logs per integration

## Security
- RLS on all tables, tenant-scoped via get_tenant_id()
*/

-- ============================================================
-- COMMISSIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS propostaone_commissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL DEFAULT propostaone_get_tenant_id() REFERENCES propostaone_tenants(id) ON DELETE CASCADE,
  policy_id uuid NOT NULL REFERENCES propostaone_policies(id),
  agent_id uuid REFERENCES propostaone_profiles(id),
  type text NOT NULL DEFAULT 'angariacao' CHECK (type IN ('angariacao','renovacao','endorsement')),
  gross_value numeric NOT NULL DEFAULT 0,
  net_value numeric NOT NULL DEFAULT 0,
  rate numeric DEFAULT 0,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','received','partially_received','cancelled')),
  due_date date,
  received_date date,
  installment_number int DEFAULT 1,
  total_installments int DEFAULT 1,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE propostaone_commissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "commissions_select" ON propostaone_commissions;
CREATE POLICY "commissions_select" ON propostaone_commissions FOR SELECT TO authenticated USING (tenant_id = propostaone_get_tenant_id());
DROP POLICY IF EXISTS "commissions_insert" ON propostaone_commissions;
CREATE POLICY "commissions_insert" ON propostaone_commissions FOR INSERT TO authenticated WITH CHECK (tenant_id = propostaone_get_tenant_id());
DROP POLICY IF EXISTS "commissions_update" ON propostaone_commissions;
CREATE POLICY "commissions_update" ON propostaone_commissions FOR UPDATE TO authenticated USING (tenant_id = propostaone_get_tenant_id()) WITH CHECK (tenant_id = propostaone_get_tenant_id());
DROP POLICY IF EXISTS "commissions_delete" ON propostaone_commissions;
CREATE POLICY "commissions_delete" ON propostaone_commissions FOR DELETE TO authenticated USING (tenant_id = propostaone_get_tenant_id());

-- ============================================================
-- FINANCIAL TRANSACTIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS propostaone_financial_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL DEFAULT propostaone_get_tenant_id() REFERENCES propostaone_tenants(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('income','expense','transfer')),
  category text NOT NULL,
  description text NOT NULL,
  amount numeric NOT NULL,
  date date NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','completed','cancelled')),
  commission_id uuid REFERENCES propostaone_commissions(id),
  policy_id uuid REFERENCES propostaone_policies(id),
  client_id uuid REFERENCES propostaone_clients(id),
  agent_id uuid REFERENCES propostaone_profiles(id),
  notes text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE propostaone_financial_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "financial_transactions_select" ON propostaone_financial_transactions;
CREATE POLICY "financial_transactions_select" ON propostaone_financial_transactions FOR SELECT TO authenticated USING (tenant_id = propostaone_get_tenant_id());
DROP POLICY IF EXISTS "financial_transactions_insert" ON propostaone_financial_transactions;
CREATE POLICY "financial_transactions_insert" ON propostaone_financial_transactions FOR INSERT TO authenticated WITH CHECK (tenant_id = propostaone_get_tenant_id());
DROP POLICY IF EXISTS "financial_transactions_update" ON propostaone_financial_transactions;
CREATE POLICY "financial_transactions_update" ON propostaone_financial_transactions FOR UPDATE TO authenticated USING (tenant_id = propostaone_get_tenant_id()) WITH CHECK (tenant_id = propostaone_get_tenant_id());
DROP POLICY IF EXISTS "financial_transactions_delete" ON propostaone_financial_transactions;
CREATE POLICY "financial_transactions_delete" ON propostaone_financial_transactions FOR DELETE TO authenticated USING (tenant_id = propostaone_get_tenant_id());

-- ============================================================
-- TRANSFERS (REPASSES)
-- ============================================================
CREATE TABLE IF NOT EXISTS propostaone_transfers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL DEFAULT propostaone_get_tenant_id() REFERENCES propostaone_tenants(id) ON DELETE CASCADE,
  agent_id uuid NOT NULL REFERENCES propostaone_profiles(id),
  amount numeric NOT NULL DEFAULT 0,
  period_start date NOT NULL,
  period_end date NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','paid','cancelled')),
  paid_at timestamptz,
  notes text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE propostaone_transfers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "transfers_select" ON propostaone_transfers;
CREATE POLICY "transfers_select" ON propostaone_transfers FOR SELECT TO authenticated USING (tenant_id = propostaone_get_tenant_id());
DROP POLICY IF EXISTS "transfers_insert" ON propostaone_transfers;
CREATE POLICY "transfers_insert" ON propostaone_transfers FOR INSERT TO authenticated WITH CHECK (tenant_id = propostaone_get_tenant_id());
DROP POLICY IF EXISTS "transfers_update" ON propostaone_transfers;
CREATE POLICY "transfers_update" ON propostaone_transfers FOR UPDATE TO authenticated USING (tenant_id = propostaone_get_tenant_id()) WITH CHECK (tenant_id = propostaone_get_tenant_id());
DROP POLICY IF EXISTS "transfers_delete" ON propostaone_transfers;
CREATE POLICY "transfers_delete" ON propostaone_transfers FOR DELETE TO authenticated USING (tenant_id = propostaone_get_tenant_id());

-- ============================================================
-- DOCUMENT FOLDERS
-- ============================================================
CREATE TABLE IF NOT EXISTS propostaone_document_folders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL DEFAULT propostaone_get_tenant_id() REFERENCES propostaone_tenants(id) ON DELETE CASCADE,
  parent_id uuid REFERENCES propostaone_document_folders(id),
  name text NOT NULL,
  client_id uuid REFERENCES propostaone_clients(id),
  policy_id uuid REFERENCES propostaone_policies(id),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE propostaone_document_folders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "document_folders_select" ON propostaone_document_folders;
CREATE POLICY "document_folders_select" ON propostaone_document_folders FOR SELECT TO authenticated USING (tenant_id = propostaone_get_tenant_id());
DROP POLICY IF EXISTS "document_folders_insert" ON propostaone_document_folders;
CREATE POLICY "document_folders_insert" ON propostaone_document_folders FOR INSERT TO authenticated WITH CHECK (tenant_id = propostaone_get_tenant_id());
DROP POLICY IF EXISTS "document_folders_update" ON propostaone_document_folders;
CREATE POLICY "document_folders_update" ON propostaone_document_folders FOR UPDATE TO authenticated USING (tenant_id = propostaone_get_tenant_id()) WITH CHECK (tenant_id = propostaone_get_tenant_id());
DROP POLICY IF EXISTS "document_folders_delete" ON propostaone_document_folders;
CREATE POLICY "document_folders_delete" ON propostaone_document_folders FOR DELETE TO authenticated USING (tenant_id = propostaone_get_tenant_id());

-- ============================================================
-- DOCUMENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS propostaone_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL DEFAULT propostaone_get_tenant_id() REFERENCES propostaone_tenants(id) ON DELETE CASCADE,
  folder_id uuid REFERENCES propostaone_document_folders(id),
  client_id uuid REFERENCES propostaone_clients(id),
  policy_id uuid REFERENCES propostaone_policies(id),
  name text NOT NULL,
  file_path text NOT NULL,
  file_size bigint,
  mime_type text,
  tags text[],
  uploaded_by uuid REFERENCES propostaone_profiles(id),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE propostaone_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "documents_select" ON propostaone_documents;
CREATE POLICY "documents_select" ON propostaone_documents FOR SELECT TO authenticated USING (tenant_id = propostaone_get_tenant_id());
DROP POLICY IF EXISTS "documents_insert" ON propostaone_documents;
CREATE POLICY "documents_insert" ON propostaone_documents FOR INSERT TO authenticated WITH CHECK (tenant_id = propostaone_get_tenant_id());
DROP POLICY IF EXISTS "documents_update" ON propostaone_documents;
CREATE POLICY "documents_update" ON propostaone_documents FOR UPDATE TO authenticated USING (tenant_id = propostaone_get_tenant_id()) WITH CHECK (tenant_id = propostaone_get_tenant_id());
DROP POLICY IF EXISTS "documents_delete" ON propostaone_documents;
CREATE POLICY "documents_delete" ON propostaone_documents FOR DELETE TO authenticated USING (tenant_id = propostaone_get_tenant_id());

-- ============================================================
-- MESSAGE TEMPLATES
-- ============================================================
CREATE TABLE IF NOT EXISTS propostaone_message_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL DEFAULT propostaone_get_tenant_id() REFERENCES propostaone_tenants(id) ON DELETE CASCADE,
  name text NOT NULL,
  channel text NOT NULL CHECK (channel IN ('whatsapp','email','sms')),
  subject text,
  body text NOT NULL,
  variables text[],
  category text,
  active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES propostaone_profiles(id),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE propostaone_message_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "message_templates_select" ON propostaone_message_templates;
CREATE POLICY "message_templates_select" ON propostaone_message_templates FOR SELECT TO authenticated USING (tenant_id = propostaone_get_tenant_id());
DROP POLICY IF EXISTS "message_templates_insert" ON propostaone_message_templates;
CREATE POLICY "message_templates_insert" ON propostaone_message_templates FOR INSERT TO authenticated WITH CHECK (tenant_id = propostaone_get_tenant_id());
DROP POLICY IF EXISTS "message_templates_update" ON propostaone_message_templates;
CREATE POLICY "message_templates_update" ON propostaone_message_templates FOR UPDATE TO authenticated USING (tenant_id = propostaone_get_tenant_id()) WITH CHECK (tenant_id = propostaone_get_tenant_id());
DROP POLICY IF EXISTS "message_templates_delete" ON propostaone_message_templates;
CREATE POLICY "message_templates_delete" ON propostaone_message_templates FOR DELETE TO authenticated USING (tenant_id = propostaone_get_tenant_id());

-- ============================================================
-- COMMUNICATION HISTORY
-- ============================================================
CREATE TABLE IF NOT EXISTS propostaone_communication_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL DEFAULT propostaone_get_tenant_id() REFERENCES propostaone_tenants(id) ON DELETE CASCADE,
  channel text NOT NULL CHECK (channel IN ('whatsapp','email','sms','call','meeting')),
  direction text NOT NULL DEFAULT 'outbound' CHECK (direction IN ('inbound','outbound')),
  client_id uuid REFERENCES propostaone_clients(id),
  lead_id uuid REFERENCES propostaone_leads(id),
  template_id uuid REFERENCES propostaone_message_templates(id),
  subject text,
  body text,
  status text NOT NULL DEFAULT 'sent' CHECK (status IN ('sent','delivered','read','failed','pending')),
  sent_by uuid REFERENCES propostaone_profiles(id),
  sent_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE propostaone_communication_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "communication_history_select" ON propostaone_communication_history;
CREATE POLICY "communication_history_select" ON propostaone_communication_history FOR SELECT TO authenticated USING (tenant_id = propostaone_get_tenant_id());
DROP POLICY IF EXISTS "communication_history_insert" ON propostaone_communication_history;
CREATE POLICY "communication_history_insert" ON propostaone_communication_history FOR INSERT TO authenticated WITH CHECK (tenant_id = propostaone_get_tenant_id());

-- ============================================================
-- AUTOMATIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS propostaone_automations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL DEFAULT propostaone_get_tenant_id() REFERENCES propostaone_tenants(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  trigger_type text NOT NULL CHECK (trigger_type IN ('birthday','renewal_days','proposal_approved','policy_expired','lead_created','manual')),
  trigger_config jsonb NOT NULL DEFAULT '{}',
  actions jsonb NOT NULL DEFAULT '[]',
  conditions jsonb DEFAULT '[]',
  active boolean NOT NULL DEFAULT true,
  runs_count int NOT NULL DEFAULT 0,
  last_run_at timestamptz,
  created_by uuid REFERENCES propostaone_profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE propostaone_automations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "automations_select" ON propostaone_automations;
CREATE POLICY "automations_select" ON propostaone_automations FOR SELECT TO authenticated USING (tenant_id = propostaone_get_tenant_id());
DROP POLICY IF EXISTS "automations_insert" ON propostaone_automations;
CREATE POLICY "automations_insert" ON propostaone_automations FOR INSERT TO authenticated WITH CHECK (tenant_id = propostaone_get_tenant_id());
DROP POLICY IF EXISTS "automations_update" ON propostaone_automations;
CREATE POLICY "automations_update" ON propostaone_automations FOR UPDATE TO authenticated USING (tenant_id = propostaone_get_tenant_id()) WITH CHECK (tenant_id = propostaone_get_tenant_id());
DROP POLICY IF EXISTS "automations_delete" ON propostaone_automations;
CREATE POLICY "automations_delete" ON propostaone_automations FOR DELETE TO authenticated USING (tenant_id = propostaone_get_tenant_id());

-- ============================================================
-- AUTOMATION LOGS
-- ============================================================
CREATE TABLE IF NOT EXISTS propostaone_automation_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL DEFAULT propostaone_get_tenant_id() REFERENCES propostaone_tenants(id) ON DELETE CASCADE,
  automation_id uuid NOT NULL REFERENCES propostaone_automations(id) ON DELETE CASCADE,
  trigger_entity_type text,
  trigger_entity_id uuid,
  status text NOT NULL DEFAULT 'success' CHECK (status IN ('success','failed','partial')),
  actions_executed jsonb DEFAULT '[]',
  error_message text,
  executed_at timestamptz DEFAULT now()
);

ALTER TABLE propostaone_automation_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "automation_logs_select" ON propostaone_automation_logs;
CREATE POLICY "automation_logs_select" ON propostaone_automation_logs FOR SELECT TO authenticated USING (tenant_id = propostaone_get_tenant_id());
DROP POLICY IF EXISTS "automation_logs_insert" ON propostaone_automation_logs;
CREATE POLICY "automation_logs_insert" ON propostaone_automation_logs FOR INSERT TO authenticated WITH CHECK (tenant_id = propostaone_get_tenant_id());

-- ============================================================
-- INSURER CONNECTORS (Global catalog — not tenant-scoped)
-- ============================================================
CREATE TABLE IF NOT EXISTS propostaone_insurer_connectors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  name text NOT NULL,
  logo_url text,
  description text,
  category text,
  supported_features text[] NOT NULL DEFAULT '{}',
  auth_fields jsonb NOT NULL DEFAULT '[]',
  status text NOT NULL DEFAULT 'available' CHECK (status IN ('available','beta','coming_soon','deprecated')),
  docs_url text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE propostaone_insurer_connectors ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "insurer_connectors_select" ON propostaone_insurer_connectors;
CREATE POLICY "insurer_connectors_select" ON propostaone_insurer_connectors FOR SELECT TO authenticated USING (true);

-- ============================================================
-- TENANT INTEGRATIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS propostaone_tenant_integrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL DEFAULT propostaone_get_tenant_id() REFERENCES propostaone_tenants(id) ON DELETE CASCADE,
  connector_id uuid NOT NULL REFERENCES propostaone_insurer_connectors(id),
  credentials jsonb NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'disconnected' CHECK (status IN ('connected','disconnected','error','pending')),
  last_sync_at timestamptz,
  last_error text,
  config jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(tenant_id, connector_id)
);

ALTER TABLE propostaone_tenant_integrations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenant_integrations_select" ON propostaone_tenant_integrations;
CREATE POLICY "tenant_integrations_select" ON propostaone_tenant_integrations FOR SELECT TO authenticated USING (tenant_id = propostaone_get_tenant_id());
DROP POLICY IF EXISTS "tenant_integrations_insert" ON propostaone_tenant_integrations;
CREATE POLICY "tenant_integrations_insert" ON propostaone_tenant_integrations FOR INSERT TO authenticated WITH CHECK (tenant_id = propostaone_get_tenant_id());
DROP POLICY IF EXISTS "tenant_integrations_update" ON propostaone_tenant_integrations;
CREATE POLICY "tenant_integrations_update" ON propostaone_tenant_integrations FOR UPDATE TO authenticated USING (tenant_id = propostaone_get_tenant_id()) WITH CHECK (tenant_id = propostaone_get_tenant_id());
DROP POLICY IF EXISTS "tenant_integrations_delete" ON propostaone_tenant_integrations;
CREATE POLICY "tenant_integrations_delete" ON propostaone_tenant_integrations FOR DELETE TO authenticated USING (tenant_id = propostaone_get_tenant_id());

-- ============================================================
-- INTEGRATION LOGS
-- ============================================================
CREATE TABLE IF NOT EXISTS propostaone_integration_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL DEFAULT propostaone_get_tenant_id() REFERENCES propostaone_tenants(id) ON DELETE CASCADE,
  integration_id uuid NOT NULL REFERENCES propostaone_tenant_integrations(id) ON DELETE CASCADE,
  method text NOT NULL,
  endpoint text NOT NULL,
  status_code int,
  duration_ms int,
  success boolean NOT NULL DEFAULT true,
  error_message text,
  executed_at timestamptz DEFAULT now()
);

ALTER TABLE propostaone_integration_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "integration_logs_select" ON propostaone_integration_logs;
CREATE POLICY "integration_logs_select" ON propostaone_integration_logs FOR SELECT TO authenticated USING (tenant_id = propostaone_get_tenant_id());
DROP POLICY IF EXISTS "integration_logs_insert" ON propostaone_integration_logs;
CREATE POLICY "integration_logs_insert" ON propostaone_integration_logs FOR INSERT TO authenticated WITH CHECK (tenant_id = propostaone_get_tenant_id());

-- ============================================================
-- SEED: Insurer Connectors Catalog
-- ============================================================
INSERT INTO propostaone_insurer_connectors (slug, name, description, category, supported_features, auth_fields, status) VALUES
  ('porto-seguro', 'Porto Seguro', 'Integração com Porto Seguro via API REST', 'multi', ARRAY['consultarApolice','emitirProposta','consultarCotacao','listarProdutos','consultarSinistro'], '[{"name":"api_key","label":"API Key","type":"password"},{"name":"client_id","label":"Client ID","type":"text"},{"name":"environment","label":"Ambiente","type":"select","options":["sandbox","production"]}]', 'available'),
  ('tokio-marine', 'Tokio Marine', 'Integração com Tokio Marine Seguradora', 'multi', ARRAY['consultarApolice','consultarCotacao','listarProdutos','emitirSegundaVia'], '[{"name":"username","label":"Usuário","type":"text"},{"name":"password","label":"Senha","type":"password"},{"name":"susep_code","label":"Código SUSEP","type":"text"}]', 'available'),
  ('azul-seguros', 'Azul Seguros', 'Integração com Azul Seguros (Porto)', 'auto', ARRAY['consultarApolice','consultarCotacao','emitirProposta'], '[{"name":"api_key","label":"API Key","type":"password"},{"name":"broker_code","label":"Código Corretor","type":"text"}]', 'available'),
  ('allianz', 'Allianz', 'Integração com Allianz Seguros', 'multi', ARRAY['consultarApolice','consultarSinistro','emitirSegundaVia','emitirProposta'], '[{"name":"api_key","label":"API Key","type":"password"},{"name":"partner_id","label":"Partner ID","type":"text"}]', 'available'),
  ('hdi-seguros', 'HDI Seguros', 'Integração com HDI Seguros Brasil', 'auto', ARRAY['consultarApolice','consultarCotacao','consultarSinistro'], '[{"name":"api_token","label":"Token API","type":"password"},{"name":"broker_code","label":"Código Corretor","type":"text"}]', 'available'),
  ('bradesco-seguros', 'Bradesco Seguros', 'Integração com Bradesco Seguros e Previdência', 'life', ARRAY['consultarApolice','listarProdutos','consultarCotacao'], '[{"name":"username","label":"Usuário","type":"text"},{"name":"password","label":"Senha","type":"password"},{"name":"cpf_cnpj","label":"CPF/CNPJ","type":"text"}]', 'available'),
  ('mapfre', 'Mapfre Seguros', 'Integração com Mapfre Brasil', 'multi', ARRAY['consultarApolice','emitirProposta','consultarSinistro','listarProdutos'], '[{"name":"api_key","label":"API Key","type":"password"},{"name":"client_id","label":"Client ID","type":"text"},{"name":"client_secret","label":"Client Secret","type":"password"}]', 'available'),
  ('sulamerica', 'SulAmérica', 'Integração com SulAmérica Seguros', 'health', ARRAY['consultarApolice','consultarCotacao','emitirSegundaVia'], '[{"name":"api_key","label":"API Key","type":"password"},{"name":"broker_code","label":"Código Corretor","type":"text"}]', 'available'),
  ('liberty-seguros', 'Liberty Seguros', 'Integração com Liberty Seguros', 'auto', ARRAY['consultarApolice','consultarCotacao','consultarSinistro'], '[{"name":"api_token","label":"Token","type":"password"},{"name":"environment","label":"Ambiente","type":"select","options":["sandbox","production"]}]', 'available'),
  ('sompo', 'Sompo Seguros', 'Integração com Sompo Seguros Brasil', 'multi', ARRAY['consultarApolice','emitirProposta'], '[{"name":"api_key","label":"API Key","type":"password"}]', 'beta'),
  ('chubb', 'Chubb Seguros', 'Integração com Chubb do Brasil', 'property', ARRAY['consultarApolice','consultarCotacao'], '[{"name":"api_key","label":"API Key","type":"password"},{"name":"broker_id","label":"Broker ID","type":"text"}]', 'beta'),
  ('zurich', 'Zurich Seguros', 'Integração com Zurich Insurance Group', 'business', ARRAY['consultarApolice','listarProdutos'], '[{"name":"api_key","label":"API Key","type":"password"}]', 'coming_soon')
ON CONFLICT (slug) DO NOTHING;

-- INDEXES
CREATE INDEX IF NOT EXISTS idx_propostaone_commissions_tenant ON propostaone_commissions(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_propostaone_commissions_policy ON propostaone_commissions(policy_id);
CREATE INDEX IF NOT EXISTS idx_propostaone_financial_transactions_tenant ON propostaone_financial_transactions(tenant_id, date);
CREATE INDEX IF NOT EXISTS idx_propostaone_communication_history_client ON propostaone_communication_history(client_id);
CREATE INDEX IF NOT EXISTS idx_propostaone_automations_tenant ON propostaone_automations(tenant_id, active);
CREATE INDEX IF NOT EXISTS idx_propostaone_tenant_integrations_tenant ON propostaone_tenant_integrations(tenant_id);


-- ════════════════════════════════════════════════════════════════
-- origem (Bolt): 20260627143746_add_super_admin_flag.sql
-- ════════════════════════════════════════════════════════════════
/*
# Add super admin flag to profiles

Adds is_super_admin boolean to profiles table to distinguish
platform-level super admins (who see ALL tenants) from
regular corretora owners/admins (who see only their own data).

Super admins bypass tenant isolation and can manage the entire platform.
*/

ALTER TABLE propostaone_profiles
ADD COLUMN IF NOT EXISTS is_super_admin boolean NOT NULL DEFAULT false;

-- Mark Fabio as super admin
UPDATE propostaone_profiles
SET is_super_admin = true
WHERE email = 'fabio@multione.com.br';


-- ════════════════════════════════════════════════════════════════
-- origem (Bolt): 20260627144209_super_admin_rls_bypass.sql
-- ════════════════════════════════════════════════════════════════

-- Helper function: returns true if the current auth user is a super admin
CREATE OR REPLACE FUNCTION propostaone_is_super_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT is_super_admin FROM propostaone_profiles WHERE id = auth.uid() LIMIT 1),
    false
  );
$$;

-- Super admin bypass policies on core tables
-- tenants
CREATE POLICY "super_admin_select_tenants" ON propostaone_tenants
  FOR SELECT TO authenticated USING (propostaone_is_super_admin());

-- profiles
CREATE POLICY "super_admin_select_profiles" ON propostaone_profiles
  FOR SELECT TO authenticated USING (propostaone_is_super_admin());

CREATE POLICY "super_admin_update_profiles" ON propostaone_profiles
  FOR UPDATE TO authenticated USING (propostaone_is_super_admin()) WITH CHECK (propostaone_is_super_admin());

-- clients
CREATE POLICY "super_admin_select_clients" ON propostaone_clients
  FOR SELECT TO authenticated USING (propostaone_is_super_admin());

-- policies
CREATE POLICY "super_admin_select_policies" ON propostaone_policies
  FOR SELECT TO authenticated USING (propostaone_is_super_admin());

-- commissions
CREATE POLICY "super_admin_select_commissions" ON propostaone_commissions
  FOR SELECT TO authenticated USING (propostaone_is_super_admin());

-- financial_transactions
CREATE POLICY "super_admin_select_financial" ON propostaone_financial_transactions
  FOR SELECT TO authenticated USING (propostaone_is_super_admin());

-- insurer_connectors (already has anon select, this is fine)
-- tenant_integrations
CREATE POLICY "super_admin_select_integrations" ON propostaone_tenant_integrations
  FOR SELECT TO authenticated USING (propostaone_is_super_admin());

-- Tenants update by super admin (for suspend/activate)
CREATE POLICY "super_admin_update_tenants" ON propostaone_tenants
  FOR UPDATE TO authenticated USING (propostaone_is_super_admin()) WITH CHECK (propostaone_is_super_admin());


-- ════════════════════════════════════════════════════════════════
-- origem (Bolt): 20260702160746_20260702_registration_fields_and_cnpj_logs.sql
-- ════════════════════════════════════════════════════════════════
/*
# Registration fields + CNPJ lookup logs

## Summary
Adds registration-tracking fields to the existing `tenants` table so the platform
can record where each corretora is in the 5-step onboarding wizard. Also creates a
`cnpj_lookup_logs` table to audit every CNPJ query made through the edge function.

## Changes to `tenants`
New columns added (all with IF NOT EXISTS guards):
- `display_name` — chosen display name entered in step 2
- `razao_social` — legal company name from Receita Federal
- `nome_fantasia` — trade name from Receita Federal
- `cnae_descricao` — primary CNAE activity description
- `porte` — company size (MEI, ME, EPP, DEMAIS)
- `capital_social` — registered share capital
- `opcao_simples` / `opcao_mei` — Simples Nacional / MEI flags
- `address_street`, `address_number`, `address_complement`, `address_neighborhood` — structured address
- `billing_email` — contact email entered by user (distinct from Receita Federal email)
- `contact_whatsapp` — WhatsApp number entered in step 3
- `registration_step` (integer 1-5, default 1) — progress tracker:
    1 = CNPJ consulted, 2 = name confirmed, 3 = account created,
    4 = business type selected, 5 = complete
- `business_type` / `business_subtype` — selected in step 4
- `utm_source`, `utm_medium`, `utm_campaign`, `gclid` — marketing attribution

## New Table: `cnpj_lookup_logs`
Audits every CNPJ API query — records provider used, success/failure, and error code.
RLS enabled; service_role writes (edge functions), no direct frontend reads.

## Indexes
Added indexes on `registration_step` and `created_at` for admin panel filtering.
*/

-- ── TENANTS: add registration fields ──────────────────────────────────────────

ALTER TABLE propostaone_tenants
  ADD COLUMN IF NOT EXISTS display_name text,
  ADD COLUMN IF NOT EXISTS razao_social text,
  ADD COLUMN IF NOT EXISTS nome_fantasia text,
  ADD COLUMN IF NOT EXISTS cnae_descricao text,
  ADD COLUMN IF NOT EXISTS porte text,
  ADD COLUMN IF NOT EXISTS capital_social numeric,
  ADD COLUMN IF NOT EXISTS opcao_simples boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS opcao_mei boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS address_street text,
  ADD COLUMN IF NOT EXISTS address_number text,
  ADD COLUMN IF NOT EXISTS address_complement text,
  ADD COLUMN IF NOT EXISTS address_neighborhood text,
  ADD COLUMN IF NOT EXISTS billing_email text,
  ADD COLUMN IF NOT EXISTS contact_whatsapp text,
  ADD COLUMN IF NOT EXISTS registration_step integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS business_type text,
  ADD COLUMN IF NOT EXISTS business_subtype text,
  ADD COLUMN IF NOT EXISTS utm_source text,
  ADD COLUMN IF NOT EXISTS utm_medium text,
  ADD COLUMN IF NOT EXISTS utm_campaign text,
  ADD COLUMN IF NOT EXISTS gclid text;

CREATE INDEX IF NOT EXISTS idx_propostaone_tenants_registration_step ON propostaone_tenants(registration_step);
CREATE INDEX IF NOT EXISTS idx_propostaone_tenants_created_at_desc  ON propostaone_tenants(created_at DESC);

-- ── CNPJ LOOKUP LOGS ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS propostaone_cnpj_lookup_logs (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cnpj       text NOT NULL,
  provider   text,
  success    boolean DEFAULT false,
  error_code text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE propostaone_cnpj_lookup_logs ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_propostaone_cnpj_logs_cnpj       ON propostaone_cnpj_lookup_logs(cnpj);
CREATE INDEX IF NOT EXISTS idx_propostaone_cnpj_logs_created_at ON propostaone_cnpj_lookup_logs(created_at DESC);


-- ════════════════════════════════════════════════════════════════
-- origem (Bolt): 20260702174933_fix_profiles_select_rls_recursion.sql
-- ════════════════════════════════════════════════════════════════

-- The profiles_select policy had a recursive subquery that triggered RLS on the
-- same table, causing zero rows to be returned for authenticated users.
-- Fix: use a SECURITY DEFINER function that reads profiles bypassing RLS.

CREATE OR REPLACE FUNCTION propostaone_get_auth_user_tenant_id()
RETURNS uuid
LANGUAGE sql SECURITY DEFINER STABLE
SET search_path = public
AS $$
  SELECT tenant_id FROM propostaone_profiles WHERE id = auth.uid()
$$;

DROP POLICY IF EXISTS "profiles_select" ON propostaone_profiles;

CREATE POLICY "profiles_select" ON propostaone_profiles FOR SELECT
  TO authenticated USING (
    id = auth.uid()
    OR tenant_id = propostaone_get_auth_user_tenant_id()
  );


-- ════════════════════════════════════════════════════════════════
-- origem (Bolt): 20260702180958_insurer_connectors_platform_management.sql
-- ════════════════════════════════════════════════════════════════
-- Add admin-controlled fields to insurer_connectors
ALTER TABLE propostaone_insurer_connectors
  ADD COLUMN IF NOT EXISTS platform_status TEXT NOT NULL DEFAULT 'draft'
    CHECK (platform_status IN ('draft', 'testing', 'active')),
  ADD COLUMN IF NOT EXISTS documentation_md TEXT,
  ADD COLUMN IF NOT EXISTS sandbox_base_url TEXT,
  ADD COLUMN IF NOT EXISTS production_base_url TEXT,
  ADD COLUMN IF NOT EXISTS api_version TEXT DEFAULT 'v1',
  ADD COLUMN IF NOT EXISTS changelog TEXT,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- Set platform_status from existing status labels
UPDATE propostaone_insurer_connectors SET platform_status = 'active'  WHERE status = 'available';
UPDATE propostaone_insurer_connectors SET platform_status = 'testing' WHERE status = 'beta';
UPDATE propostaone_insurer_connectors SET platform_status = 'draft'   WHERE status = 'coming_soon';

-- Restrict client SELECT to only active connectors; super admins see all
DROP POLICY IF EXISTS "insurer_connectors_select" ON propostaone_insurer_connectors;

CREATE POLICY "insurer_connectors_select" ON propostaone_insurer_connectors FOR SELECT
  TO authenticated USING (
    platform_status = 'active'
    OR propostaone_is_super_admin()
  );

-- Super admin can INSERT / UPDATE / DELETE connectors
DROP POLICY IF EXISTS "super_admin_manage_connectors" ON propostaone_insurer_connectors;
CREATE POLICY "super_admin_manage_connectors" ON propostaone_insurer_connectors FOR ALL
  TO authenticated USING (propostaone_is_super_admin()) WITH CHECK (propostaone_is_super_admin());


-- ════════════════════════════════════════════════════════════════
-- origem (Bolt): 20260702184259_add_insurance_branches_to_tenants.sql
-- ════════════════════════════════════════════════════════════════
ALTER TABLE propostaone_tenants
  ADD COLUMN IF NOT EXISTS insurance_branches TEXT[],
  ADD COLUMN IF NOT EXISTS insurance_subbranches TEXT[];

COMMENT ON COLUMN propostaone_tenants.insurance_branches IS 'Array of insurance segment IDs the broker operates in';
COMMENT ON COLUMN propostaone_tenants.insurance_subbranches IS 'Array of sub-segment IDs selected by the broker';


-- ════════════════════════════════════════════════════════════════
-- STORAGE: documentos (privado, uma pasta por tenant: <tenant_id>/arquivo)
-- ════════════════════════════════════════════════════════════════
INSERT INTO storage.buckets (id, name, public)
VALUES ('propostaone-documents', 'propostaone-documents', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "propostaone_documents_select" ON storage.objects;
CREATE POLICY "propostaone_documents_select" ON storage.objects FOR SELECT
  TO authenticated USING (
    bucket_id = 'propostaone-documents'
    AND (storage.foldername(name))[1] = propostaone_get_tenant_id()::text
  );

DROP POLICY IF EXISTS "propostaone_documents_insert" ON storage.objects;
CREATE POLICY "propostaone_documents_insert" ON storage.objects FOR INSERT
  TO authenticated WITH CHECK (
    bucket_id = 'propostaone-documents'
    AND (storage.foldername(name))[1] = propostaone_get_tenant_id()::text
  );

DROP POLICY IF EXISTS "propostaone_documents_delete" ON storage.objects;
CREATE POLICY "propostaone_documents_delete" ON storage.objects FOR DELETE
  TO authenticated USING (
    bucket_id = 'propostaone-documents'
    AND (storage.foldername(name))[1] = propostaone_get_tenant_id()::text
  );
