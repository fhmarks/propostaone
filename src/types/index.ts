export type UserRole = 'owner' | 'admin' | 'manager' | 'agent' | 'viewer';
export type TenantPlan = 'free' | 'starter' | 'professional' | 'enterprise';
export type TenantStatus = 'active' | 'suspended' | 'cancelled';
export type PolicyStatus = 'proposal' | 'active' | 'renewed' | 'cancelled' | 'expired' | 'suspended';
export type PolicyCategory = 'auto' | 'life' | 'health' | 'property' | 'business' | 'rural' | 'transport' | 'liability' | 'other';
export type LeadStatus = 'new' | 'contacted' | 'qualified' | 'unqualified' | 'converted';
export type OpportunityStatus = 'open' | 'won' | 'lost' | 'paused';
export type EventType = 'appointment' | 'visit' | 'call' | 'renewal' | 'task' | 'other';
export type CommissionStatus = 'pending' | 'received' | 'partially_received' | 'cancelled';
export type IntegrationStatus = 'connected' | 'disconnected' | 'error' | 'pending';

export interface Tenant {
  id: string;
  name: string;
  slug?: string;
  logo_url?: string;
  cnpj?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  plan: TenantPlan;
  status: TenantStatus;
  created_at: string;
  // Registration wizard fields
  display_name?: string;
  razao_social?: string;
  nome_fantasia?: string;
  registration_step?: number;
  business_type?: string;
  business_subtype?: string;
  insurance_branches?: string[];
  insurance_subbranches?: string[];
  billing_email?: string;
  contact_whatsapp?: string;
}

export interface Profile {
  id: string;
  tenant_id: string;
  full_name: string;
  email?: string;
  phone?: string;
  avatar_url?: string;
  role: UserRole;
  job_title?: string;
  active: boolean;
  is_super_admin: boolean;
  created_at: string;
}

export interface Client {
  id: string;
  tenant_id: string;
  type: 'individual' | 'company';
  full_name: string;
  cpf_cnpj?: string;
  email?: string;
  phone?: string;
  phone2?: string;
  birth_date?: string;
  gender?: 'M' | 'F' | 'other';
  profession?: string;
  marital_status?: string;
  address?: string;
  address_number?: string;
  address_complement?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  company_id?: string;
  assigned_to?: string;
  status: 'active' | 'inactive' | 'prospect';
  origin?: string;
  notes?: string;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
}

export interface Lead {
  id: string;
  tenant_id: string;
  full_name: string;
  email?: string;
  phone?: string;
  company?: string;
  interest?: string;
  origin?: string;
  status: LeadStatus;
  score?: number;
  assigned_to?: string;
  converted_to?: string;
  converted_at?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface Company {
  id: string;
  tenant_id: string;
  name: string;
  cnpj?: string;
  email?: string;
  phone?: string;
  website?: string;
  city?: string;
  state?: string;
  segment?: string;
  active: boolean;
  assigned_to?: string;
  created_at: string;
}

export interface Pipeline {
  id: string;
  tenant_id: string;
  name: string;
  description?: string;
  active: boolean;
  created_at: string;
}

export interface PipelineStage {
  id: string;
  tenant_id: string;
  pipeline_id: string;
  name: string;
  color: string;
  sort_order: number;
  probability: number;
  created_at: string;
}

export interface Opportunity {
  id: string;
  tenant_id: string;
  pipeline_id: string;
  stage_id: string;
  title: string;
  client_id?: string;
  lead_id?: string;
  assigned_to?: string;
  value: number;
  probability: number;
  expected_close?: string;
  origin?: string;
  product_type?: string;
  insurer?: string;
  status: OpportunityStatus;
  lost_reason?: string;
  notes?: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
  client?: Client;
  stage?: PipelineStage;
}

export interface CalendarEvent {
  id: string;
  tenant_id: string;
  title: string;
  description?: string;
  type: EventType;
  start_at: string;
  end_at?: string;
  all_day: boolean;
  location?: string;
  status: 'pending' | 'completed' | 'cancelled' | 'no_show';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  client_id?: string;
  lead_id?: string;
  opportunity_id?: string;
  assigned_to?: string;
  reminder_minutes?: number;
  created_by?: string;
  created_at: string;
  client?: Client;
}

export interface Insurer {
  id: string;
  tenant_id: string;
  name: string;
  cnpj?: string;
  logo_url?: string;
  contact_email?: string;
  contact_phone?: string;
  website?: string;
  susep_code?: string;
  active: boolean;
  created_at: string;
}

export interface InsuranceProduct {
  id: string;
  tenant_id: string;
  insurer_id?: string;
  name: string;
  category: PolicyCategory;
  description?: string;
  commission_rate: number;
  active: boolean;
  created_at: string;
  insurer?: Insurer;
}

export interface Policy {
  id: string;
  tenant_id: string;
  policy_number?: string;
  client_id: string;
  insurer_id?: string;
  product_id?: string;
  assigned_to?: string;
  status: PolicyStatus;
  category: PolicyCategory;
  start_date: string;
  end_date: string;
  premium: number;
  insured_value?: number;
  installments: number;
  payment_method?: string;
  commission_rate: number;
  commission_value: number;
  insured_object?: string;
  insured_cpf_cnpj?: string;
  notes?: string;
  proposal_date?: string;
  emission_date?: string;
  renewed_from?: string;
  created_at: string;
  updated_at: string;
  client?: Client;
  insurer?: Insurer;
  product?: InsuranceProduct;
}

export interface Commission {
  id: string;
  tenant_id: string;
  policy_id: string;
  agent_id?: string;
  type: 'angariacao' | 'renovacao' | 'endorsement';
  gross_value: number;
  net_value: number;
  rate: number;
  status: CommissionStatus;
  due_date?: string;
  received_date?: string;
  installment_number: number;
  total_installments: number;
  notes?: string;
  created_at: string;
  policy?: Policy;
  agent?: Profile;
}

export interface FinancialTransaction {
  id: string;
  tenant_id: string;
  type: 'income' | 'expense' | 'transfer';
  category: string;
  description: string;
  amount: number;
  date: string;
  status: 'pending' | 'completed' | 'cancelled';
  commission_id?: string;
  policy_id?: string;
  client_id?: string;
  agent_id?: string;
  notes?: string;
  created_at: string;
}

export interface Document {
  id: string;
  tenant_id: string;
  folder_id?: string;
  client_id?: string;
  policy_id?: string;
  name: string;
  file_path: string;
  file_size?: number;
  mime_type?: string;
  tags?: string[];
  uploaded_by?: string;
  created_at: string;
}

export interface MessageTemplate {
  id: string;
  tenant_id: string;
  name: string;
  channel: 'whatsapp' | 'email' | 'sms';
  subject?: string;
  body: string;
  variables?: string[];
  category?: string;
  active: boolean;
  created_by?: string;
  created_at: string;
}

export interface CommunicationHistory {
  id: string;
  tenant_id: string;
  channel: 'whatsapp' | 'email' | 'sms' | 'call' | 'meeting';
  direction: 'inbound' | 'outbound';
  client_id?: string;
  lead_id?: string;
  template_id?: string;
  subject?: string;
  body?: string;
  status: 'sent' | 'delivered' | 'read' | 'failed' | 'pending';
  sent_by?: string;
  sent_at: string;
  created_at: string;
  client?: Client;
}

export interface Automation {
  id: string;
  tenant_id: string;
  name: string;
  description?: string;
  trigger_type: 'birthday' | 'renewal_days' | 'proposal_approved' | 'policy_expired' | 'lead_created' | 'manual';
  trigger_config: Record<string, unknown>;
  actions: AutomationAction[];
  conditions: AutomationCondition[];
  active: boolean;
  runs_count: number;
  last_run_at?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface AutomationAction {
  type: 'send_whatsapp' | 'send_email' | 'create_task' | 'create_policy' | 'notify_agent';
  config: Record<string, unknown>;
  delay_hours?: number;
}

export interface AutomationCondition {
  field: string;
  operator: string;
  value: unknown;
}

export interface InsurerConnector {
  id: string;
  slug: string;
  name: string;
  logo_url?: string;
  description?: string;
  category?: string;
  supported_features: string[];
  auth_fields: ConnectorAuthField[];
  status: 'available' | 'beta' | 'coming_soon' | 'deprecated';
  platform_status: 'draft' | 'testing' | 'active';
  docs_url?: string;
  documentation_md?: string;
  sandbox_base_url?: string;
  production_base_url?: string;
  api_version?: string;
  changelog?: string;
  updated_at?: string;
  created_at: string;
}

export interface ConnectorAuthField {
  name: string;
  label: string;
  type: 'text' | 'password' | 'select';
  options?: string[];
}

export interface TenantIntegration {
  id: string;
  tenant_id: string;
  connector_id: string;
  credentials: Record<string, string>;
  status: IntegrationStatus;
  last_sync_at?: string;
  last_error?: string;
  config?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  connector?: InsurerConnector;
}

export interface Notification {
  id: string;
  tenant_id: string;
  profile_id: string;
  title: string;
  body?: string;
  type: 'info' | 'success' | 'warning' | 'error' | 'renewal' | 'task';
  read: boolean;
  link?: string;
  created_at: string;
}

export interface ClientNote {
  id: string;
  tenant_id: string;
  client_id?: string;
  lead_id?: string;
  author_id: string;
  content: string;
  created_at: string;
  author?: Profile;
}

export interface ClientTimeline {
  id: string;
  tenant_id: string;
  client_id?: string;
  lead_id?: string;
  actor_id?: string;
  event_type: string;
  description: string;
  metadata?: Record<string, unknown>;
  created_at: string;
  actor?: Profile;
}
