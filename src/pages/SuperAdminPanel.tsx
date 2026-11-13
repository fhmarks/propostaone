import React, { useEffect, useState, useCallback } from 'react';
import {
  Shield, Building2, Users, FileText, DollarSign, Activity,
  TrendingUp, CheckCircle, XCircle, Clock, AlertCircle,
  LogOut, RefreshCw, Search, ChevronDown, Eye, Ban,
  MoreVertical, Globe, Zap, Star, Crown, Lock, Unlock,
  BarChart3, ArrowUpRight, Settings, Bell, Database, Filter,
  Store, MessageCircle, ExternalLink, Phone, Mail, MapPin,
  CreditCard, UserCheck, Briefcase, Package
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import type { Tenant, Profile } from '../types';
import InsurerManagementTab from './admin/InsurerManagementTab';

interface TenantStats {
  tenant: Tenant;
  user_count: number;
  policy_count: number;
  client_count: number;
  active_policies: number;
}

interface PlatformKPIs {
  total_tenants: number;
  active_tenants: number;
  total_users: number;
  total_clients: number;
  total_policies: number;
  active_policies: number;
}

const planColors: Record<string, string> = {
  free:         'badge-gray',
  starter:      'badge-blue',
  professional: 'badge-cyan',
  enterprise:   'badge-amber',
};

const planIcons: Record<string, React.ComponentType<{className?:string}>> = {
  free:         Clock,
  starter:      Star,
  professional: TrendingUp,
  enterprise:   Crown,
};

const statusColors: Record<string, string> = {
  active:    'badge-green',
  suspended: 'badge-red',
  cancelled: 'badge-gray',
};

const fmt = (v: number) => new Intl.NumberFormat('pt-BR').format(v);
const fmtCurrency = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(v);

type AdminTab = 'overview' | 'tenants' | 'users' | 'insurers' | 'system';

const REG_STEP_LABELS = ['CNPJ', 'Empresa', 'Acesso', 'Negócio', 'Completo'];

function RegistrationProgress({ step }: { step: number }) {
  const completed = Math.min(step, 5);
  return (
    <div className="flex items-center gap-1" title={`Passo ${completed} de 5: ${REG_STEP_LABELS[completed - 1] ?? 'Desconhecido'}`}>
      {REG_STEP_LABELS.map((label, i) => (
        <div
          key={label}
          title={label}
          className={`h-1.5 rounded-full flex-1 transition-all ${i < completed ? 'bg-emerald-500' : 'bg-white/[0.08]'}`}
          style={{ minWidth: 14 }}
        />
      ))}
    </div>
  );
}

function RegStepBadge({ step }: { step?: number }) {
  const s = step ?? 1;
  if (s >= 5) return <span className="badge-green">Completo</span>;
  return <span className="badge-amber">Passo {s}/5</span>;
}

export default function SuperAdminPanel() {
  const { profile, signOut } = useAuth();
  const [tab, setTab] = useState<AdminTab>('overview');
  const [kpis, setKpis] = useState<PlatformKPIs>({ total_tenants:0, active_tenants:0, total_users:0, total_clients:0, total_policies:0, active_policies:0 });
  const [tenants, setTenants] = useState<TenantStats[]>([]);
  const [allUsers, setAllUsers] = useState<(Profile & { tenant_name?: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedTenant, setSelectedTenant] = useState<TenantStats | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);

    // Fetch all tenants (super admin bypasses RLS via service role perspective — but we're still using anon key)
    // Since our profile has get_tenant_id() pointing to MultiOne tenant, we need a workaround.
    // We'll use a security definer function or just query without RLS scope.
    // The proper approach: query tenants where we use service-role perspective
    // For now: fetch all tenants by joining from profiles (super admin can see own tenant via RLS)
    // We use execute approach: fetch all data needed

    const [tenantsRes, usersRes, clientsRes, policiesRes] = await Promise.all([
      supabase.from('propostaone_tenants').select('*').order('created_at', { ascending: false }),
      supabase.from('propostaone_profiles').select('*, tenant:propostaone_tenants(name)').order('created_at', { ascending: false }),
      supabase.from('propostaone_clients').select('id, tenant_id'),
      supabase.from('propostaone_policies').select('id, tenant_id, status'),
    ]);

    const tenantsData = (tenantsRes.data ?? []) as Tenant[];
    const usersData = (usersRes.data ?? []) as (Profile & { tenant?: { name: string } })[];
    const clientsData = (clientsRes.data ?? []) as { id: string; tenant_id: string }[];
    const policiesData = (policiesRes.data ?? []) as { id: string; tenant_id: string; status: string }[];

    // Build tenant stats
    const stats: TenantStats[] = tenantsData.map(t => ({
      tenant: t,
      user_count: usersData.filter(u => u.tenant_id === t.id).length,
      policy_count: policiesData.filter(p => p.tenant_id === t.id).length,
      client_count: clientsData.filter(c => c.tenant_id === t.id).length,
      active_policies: policiesData.filter(p => p.tenant_id === t.id && p.status === 'active').length,
    }));

    setTenants(stats);

    const enrichedUsers = usersData.map(u => ({
      ...u,
      tenant_name: (u.tenant as { name?: string })?.name ?? 'Desconhecido',
    }));
    setAllUsers(enrichedUsers);

    setKpis({
      total_tenants: tenantsData.length,
      active_tenants: tenantsData.filter(t => t.status === 'active').length,
      total_users: usersData.length,
      total_clients: clientsData.length,
      total_policies: policiesData.length,
      active_policies: policiesData.filter(p => p.status === 'active').length,
    });

    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  async function toggleTenantStatus(tenantId: string, currentStatus: string) {
    const newStatus = currentStatus === 'active' ? 'suspended' : 'active';
    await supabase.from('propostaone_tenants').update({ status: newStatus }).eq('id', tenantId);
    fetchData();
  }

  const filteredTenants = tenants.filter(t => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      t.tenant.name.toLowerCase().includes(q) ||
      t.tenant.nome_fantasia?.toLowerCase().includes(q) ||
      t.tenant.razao_social?.toLowerCase().includes(q) ||
      t.tenant.cnpj?.includes(q) ||
      t.tenant.email?.toLowerCase().includes(q) ||
      t.tenant.billing_email?.toLowerCase().includes(q) ||
      t.tenant.city?.toLowerCase().includes(q) ||
      t.tenant.contact_whatsapp?.includes(q)
    );
  });

  const filteredUsers = allUsers.filter(u =>
    !search || u.full_name.toLowerCase().includes(search.toLowerCase()) ||
    u.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-app-bg flex">
      {/* Sidebar */}
      <aside className="w-64 flex-shrink-0 flex flex-col bg-sidebar-bg border-r border-white/[0.06] backdrop-blur-2xl">
        {/* Logo */}
        <div className="h-16 px-4 flex items-center gap-3 border-b border-white/[0.06]">
          <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center flex-shrink-0">
            <Crown className="w-4 h-4 text-amber-400" />
          </div>
          <div>
            <div className="font-bold text-white text-sm leading-tight">
              Corretora<span className="text-amber-400">One</span>
            </div>
            <div className="text-[10px] text-amber-400/70 font-medium">Painel da Plataforma</div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-2 space-y-1 py-4">
          {([
            ['overview',  'Visão Geral', BarChart3],
            ['tenants',   'Corretoras',  Building2],
            ['users',     'Usuários',    Users],
            ['insurers',  'Seguradoras', Store],
            ['system',    'Sistema',     Settings],
          ] as [AdminTab, string, React.ComponentType<{className?:string}>][]).map(([id, label, Icon]) => (
            <button
              key={id}
              onClick={() => { setTab(id); setSearch(''); }}
              className={tab === id ? 'nav-item-active w-full' : 'nav-item w-full'}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </nav>

        {/* User */}
        <div className="p-2 border-t border-white/[0.06]">
          <div className="flex items-center gap-2.5 px-2.5 py-2 rounded-xl">
            <div className="w-7 h-7 rounded-full bg-amber-500/20 border border-amber-500/30 flex items-center justify-center flex-shrink-0">
              <Crown className="w-3.5 h-3.5 text-amber-400" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-medium text-white/80 truncate">{profile?.full_name}</div>
              <div className="text-[10px] text-amber-400/70">Super Admin</div>
            </div>
            <button
              onClick={signOut}
              className="text-white/30 hover:text-red-400 transition-colors"
              title="Sair"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Topbar */}
        <header className="h-16 border-b border-white/[0.06] flex items-center px-6 gap-4 bg-white/[0.01] backdrop-blur-sm flex-shrink-0">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-amber-400" />
              <h2 className="text-sm font-semibold text-white">
                {tab === 'overview'  ? 'Visão Geral da Plataforma' :
                 tab === 'tenants'   ? 'Gerenciar Corretoras' :
                 tab === 'users'     ? 'Todos os Usuários' :
                 tab === 'insurers'  ? 'Gerenciar Seguradoras' :
                 'Status do Sistema'}
              </h2>
            </div>
            <div className="text-xs text-white/40 ml-6">CorretoraOne Platform Admin</div>
          </div>

          {/* Search — only for users tab */}
          {tab === 'users' && (
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
              <input
                className="input-glass pl-9 h-9 text-xs"
                placeholder="Buscar usuário..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
          )}

          <button onClick={fetchData} className="btn-glass text-xs">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </button>

          {/* Super admin badge */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20">
            <Crown className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-xs font-semibold text-amber-300">Super Admin</span>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-6 animate-fade-in">

            {/* ────────────── OVERVIEW ────────────── */}
            {tab === 'overview' && (
              <>
                <div>
                  <h1 className="text-2xl font-bold text-white">
                    Bem-vindo, <span className="text-amber-400">{profile?.full_name?.split(' ')[0]}</span>
                  </h1>
                  <p className="text-white/50 text-sm mt-0.5">
                    Painel de controle da plataforma CorretoraOne — visibilidade total
                  </p>
                </div>

                {/* KPI grid */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                  {[
                    { label: 'Corretoras',           value: fmt(kpis.total_tenants),     icon: Building2,  color: 'amber' },
                    { label: 'Corretoras ativas',    value: fmt(kpis.active_tenants),    icon: CheckCircle,color: 'green' },
                    { label: 'Usuários cadastrados', value: fmt(kpis.total_users),       icon: Users,      color: 'blue' },
                    { label: 'Clientes na plataforma',value: fmt(kpis.total_clients),    icon: Globe,      color: 'cyan' },
                    { label: 'Total de apólices',    value: fmt(kpis.total_policies),    icon: FileText,   color: 'violet' },
                    { label: 'Apólices ativas',      value: fmt(kpis.active_policies),   icon: Activity,   color: 'green' },
                  ].map((k, i) => {
                    const Icon = k.icon;
                    const cMap: Record<string, string> = {
                      amber: 'bg-amber-500/10 border-amber-500/20 text-amber-400',
                      green: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
                      blue:  'bg-brand-500/10 border-brand-500/20 text-brand-400',
                      cyan:  'bg-cyan-500/10 border-cyan-500/20 text-cyan-400',
                      violet:'bg-violet-500/10 border-violet-500/20 text-violet-400',
                    };
                    return (
                      <div key={i} className="glass-card p-4 animate-slide-up" style={{ animationDelay: `${i*40}ms` }}>
                        <div className={`w-8 h-8 rounded-xl border flex items-center justify-center mb-2 ${cMap[k.color]}`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="text-xl font-bold text-white">{k.value}</div>
                        <div className="text-xs text-white/50 mt-0.5 leading-tight">{k.label}</div>
                      </div>
                    );
                  })}
                </div>

                {/* Tenants overview table */}
                <div className="glass-card overflow-hidden">
                  <div className="px-5 py-4 border-b border-white/[0.06] flex items-center justify-between">
                    <h3 className="font-semibold text-white flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-amber-400" />
                      Corretoras na plataforma
                    </h3>
                    <button onClick={() => setTab('tenants')} className="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1 transition-colors">
                      Ver todas <ArrowUpRight className="w-3 h-3" />
                    </button>
                  </div>
                  {loading ? (
                    <div className="p-8 flex items-center justify-center">
                      <div className="w-6 h-6 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
                    </div>
                  ) : (
                    <table className="table-glass">
                      <thead>
                        <tr>
                          <th>Corretora</th>
                          <th>Plano</th>
                          <th>Usuários</th>
                          <th>Clientes</th>
                          <th>Apólices</th>
                          <th>Cadastro</th>
                          <th>Status</th>
                          <th>Criada em</th>
                        </tr>
                      </thead>
                      <tbody>
                        {tenants.slice(0, 8).map(ts => {
                          const PlanIcon = planIcons[ts.tenant.plan] ?? Star;
                          return (
                            <tr key={ts.tenant.id}>
                              <td>
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center flex-shrink-0">
                                    <Building2 className="w-4 h-4 text-amber-400" />
                                  </div>
                                  <div>
                                    <div className="text-sm font-semibold text-white/90">{ts.tenant.name}</div>
                                    <div className="text-xs text-white/40">{ts.tenant.email ?? 'Sem email'}</div>
                                  </div>
                                </div>
                              </td>
                              <td>
                                <div className="flex items-center gap-1.5">
                                  <PlanIcon className="w-3.5 h-3.5 text-white/50" />
                                  <span className={planColors[ts.tenant.plan] ?? 'badge-gray'}>
                                    {ts.tenant.plan}
                                  </span>
                                </div>
                              </td>
                              <td><span className="text-sm text-white/80">{ts.user_count}</span></td>
                              <td><span className="text-sm text-white/80">{ts.client_count}</span></td>
                              <td>
                                <div>
                                  <span className="text-sm text-white/80">{ts.policy_count}</span>
                                  {ts.active_policies > 0 && (
                                    <span className="text-xs text-emerald-400 ml-1">({ts.active_policies} ativas)</span>
                                  )}
                                </div>
                              </td>
                              <td>
                                <div className="w-24">
                                  <RegistrationProgress step={ts.tenant.registration_step ?? 1} />
                                </div>
                              </td>
                              <td>
                                <span className={statusColors[ts.tenant.status] ?? 'badge-gray'}>
                                  {ts.tenant.status === 'active' ? 'Ativa' : ts.tenant.status === 'suspended' ? 'Suspensa' : 'Cancelada'}
                                </span>
                              </td>
                              <td>
                                <span className="text-xs text-white/40">
                                  {new Date(ts.tenant.created_at).toLocaleDateString('pt-BR')}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>

                {/* Plan distribution */}
                <div className="grid grid-cols-2 gap-6">
                  <div className="glass-card p-5">
                    <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
                      <Star className="w-4 h-4 text-amber-400" />
                      Distribuição por Plano
                    </h3>
                    {(['free','starter','professional','enterprise'] as const).map(plan => {
                      const count = tenants.filter(t => t.tenant.plan === plan).length;
                      const pct = kpis.total_tenants > 0 ? (count / kpis.total_tenants) * 100 : 0;
                      const PlanIcon = planIcons[plan];
                      return (
                        <div key={plan} className="mb-3">
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span className="flex items-center gap-1.5 text-white/60 capitalize">
                              <PlanIcon className="w-3.5 h-3.5" />
                              {plan}
                            </span>
                            <span className="text-white/40">{count} corretoras</span>
                          </div>
                          <div className="h-2 bg-white/[0.06] rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${plan === 'enterprise' ? 'bg-amber-500' : plan === 'professional' ? 'bg-cyan-500' : plan === 'starter' ? 'bg-brand-500' : 'bg-white/30'}`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="glass-card p-5">
                    <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
                      <Activity className="w-4 h-4 text-emerald-400" />
                      Métricas da Plataforma
                    </h3>
                    <div className="space-y-3">
                      {[
                        { label: 'Avg. clientes por corretora', value: kpis.total_tenants > 0 ? fmt(Math.round(kpis.total_clients / kpis.total_tenants)) : '0' },
                        { label: 'Avg. apólices por corretora', value: kpis.total_tenants > 0 ? fmt(Math.round(kpis.total_policies / kpis.total_tenants)) : '0' },
                        { label: 'Avg. usuários por corretora', value: kpis.total_tenants > 0 ? fmt(Math.round(kpis.total_users / kpis.total_tenants)) : '0' },
                        { label: 'Taxa de atividade', value: kpis.total_tenants > 0 ? `${Math.round((kpis.active_tenants / kpis.total_tenants) * 100)}%` : '0%' },
                      ].map(item => (
                        <div key={item.label} className="flex justify-between items-center py-2 border-b border-white/[0.04] last:border-0">
                          <span className="text-xs text-white/50">{item.label}</span>
                          <span className="text-sm font-semibold text-white/90">{item.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* ────────────── TENANTS ────────────── */}
            {tab === 'tenants' && (
              <>
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div>
                    <h1 className="text-2xl font-bold text-white">Corretoras</h1>
                    <p className="text-sm text-white/40 mt-0.5">{tenants.length} corretoras cadastradas</p>
                  </div>
                </div>

                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                  <input
                    className="input-field pl-11 w-full text-sm"
                    placeholder="Buscar por nome, CNPJ, e-mail ou cidade..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                  />
                </div>

                {/* Stats row */}
                {(() => {
                  const free   = tenants.filter(t => t.tenant.plan === 'free').length;
                  const paid   = tenants.filter(t => t.tenant.plan !== 'free').length;
                  const pend   = tenants.filter(t => (t.tenant.registration_step ?? 1) < 5).length;
                  const done   = tenants.filter(t => (t.tenant.registration_step ?? 1) >= 5).length;
                  const stats  = [
                    { label: 'Total',             value: tenants.length,             color: 'text-white/90' },
                    { label: 'Ativas',            value: kpis.active_tenants,        color: 'text-emerald-400' },
                    { label: 'Plano Gratuito',    value: free,                       color: 'text-white/60' },
                    { label: 'Planos Pagos',      value: paid,                       color: 'text-amber-400' },
                    { label: 'Cadastro Pendente', value: pend,                       color: 'text-orange-400' },
                    { label: 'Onboarding Completo', value: done,                     color: 'text-cyan-400' },
                  ];
                  return (
                    <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
                      {stats.map(s => (
                        <div key={s.label} className="glass-card p-4 text-center">
                          <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
                          <div className="text-[11px] text-white/40 mt-0.5 leading-tight">{s.label}</div>
                        </div>
                      ))}
                    </div>
                  );
                })()}

                {/* Table */}
                {loading ? (
                  <div className="glass-card p-12 flex items-center justify-center">
                    <div className="w-6 h-6 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : filteredTenants.length === 0 ? (
                  <div className="glass-card p-12 text-center">
                    <Building2 className="w-12 h-12 mx-auto text-white/20 mb-3" />
                    <div className="text-white/50">Nenhuma corretora encontrada</div>
                  </div>
                ) : (
                  <div className="glass-card overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[1100px]">
                        <thead>
                          <tr className="border-b border-white/[0.06]">
                            {['Empresa', 'CNPJ', 'Segmento', 'Cidade/UF', 'Contato', 'Plano', 'Status', 'Membros', 'Cadastro', 'Data', ''].map(col => (
                              <th key={col} className="text-left text-[10px] font-semibold text-white/30 uppercase tracking-wider px-4 py-3 whitespace-nowrap">
                                {col}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {filteredTenants.map(ts => {
                            const isActive   = ts.tenant.status === 'active';
                            const step       = ts.tenant.registration_step ?? 1;
                            const stepPct    = Math.round((step / 5) * 100);
                            const isDone     = step >= 5;
                            const stoppedAt  = isDone ? null : REG_STEP_LABELS[step - 1];
                            const PlanIcon   = planIcons[ts.tenant.plan] ?? Star;
                            const planLabel: Record<string, string> = { free: 'Gratuito', starter: 'Starter', professional: 'Professional', enterprise: 'Enterprise' };

                            return (
                              <tr key={ts.tenant.id} className="border-b border-white/[0.04] last:border-0 hover:bg-white/[0.02] transition-colors group">

                                {/* Empresa */}
                                <td className="px-4 py-3">
                                  <div className="flex items-center gap-3 min-w-[160px]">
                                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 text-sm font-bold
                                      ${isActive ? 'bg-amber-500/15 border border-amber-500/25 text-amber-300' : 'bg-white/[0.05] border border-white/[0.08] text-white/30'}`}>
                                      {(ts.tenant.nome_fantasia ?? ts.tenant.name).charAt(0).toUpperCase()}
                                    </div>
                                    <div className="min-w-0">
                                      <div className="text-sm font-semibold text-white/90 truncate max-w-[140px]">
                                        {ts.tenant.nome_fantasia ?? ts.tenant.name}
                                      </div>
                                      {ts.tenant.razao_social && ts.tenant.razao_social !== ts.tenant.name && (
                                        <div className="text-[10px] text-white/30 truncate max-w-[140px]">
                                          {ts.tenant.razao_social}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </td>

                                {/* CNPJ */}
                                <td className="px-4 py-3">
                                  <span className="text-xs font-mono text-white/50 whitespace-nowrap">
                                    {ts.tenant.cnpj ?? <span className="text-white/20">—</span>}
                                  </span>
                                </td>

                                {/* Segmento */}
                                <td className="px-4 py-3">
                                  <div className="min-w-[100px]">
                                    {ts.tenant.business_type ? (
                                      <>
                                        <div className="text-xs text-white/70 capitalize">{ts.tenant.business_type}</div>
                                        {ts.tenant.business_subtype && (
                                          <div className="text-[10px] text-white/35 capitalize">{ts.tenant.business_subtype}</div>
                                        )}
                                      </>
                                    ) : <span className="text-white/20 text-xs">—</span>}
                                  </div>
                                </td>

                                {/* Cidade/UF */}
                                <td className="px-4 py-3">
                                  {ts.tenant.city ? (
                                    <div className="flex items-start gap-1.5 min-w-[100px]">
                                      <MapPin className="w-3.5 h-3.5 text-white/30 mt-0.5 flex-shrink-0" />
                                      <div>
                                        <div className="text-xs text-white/70">{ts.tenant.city}</div>
                                        {ts.tenant.state && (
                                          <div className="text-[10px] text-white/35">{ts.tenant.state}</div>
                                        )}
                                      </div>
                                    </div>
                                  ) : <span className="text-white/20 text-xs px-1">—</span>}
                                </td>

                                {/* Contato */}
                                <td className="px-4 py-3">
                                  <div className="min-w-[160px] space-y-0.5">
                                    {ts.tenant.contact_whatsapp && (
                                      <div className="flex items-center gap-1.5">
                                        <Phone className="w-3 h-3 text-white/30 flex-shrink-0" />
                                        <span className="text-[11px] text-brand-400 font-mono">{ts.tenant.contact_whatsapp}</span>
                                      </div>
                                    )}
                                    {(ts.tenant.billing_email ?? ts.tenant.email) && (
                                      <div className="flex items-center gap-1.5">
                                        <Mail className="w-3 h-3 text-white/30 flex-shrink-0" />
                                        <span className="text-[11px] text-white/50 truncate max-w-[140px]">
                                          {ts.tenant.billing_email ?? ts.tenant.email}
                                        </span>
                                      </div>
                                    )}
                                    {!ts.tenant.contact_whatsapp && !ts.tenant.email && !ts.tenant.billing_email && (
                                      <span className="text-white/20 text-xs">—</span>
                                    )}
                                  </div>
                                </td>

                                {/* Plano */}
                                <td className="px-4 py-3 whitespace-nowrap">
                                  <span className={planColors[ts.tenant.plan] ?? 'badge-gray'}>
                                    <PlanIcon className="w-3 h-3" />
                                    {planLabel[ts.tenant.plan] ?? ts.tenant.plan}
                                  </span>
                                </td>

                                {/* Status */}
                                <td className="px-4 py-3 whitespace-nowrap">
                                  <div className="flex items-center gap-1.5">
                                    <div className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-emerald-400' : 'bg-white/25'}`} />
                                    <span className={isActive ? 'text-xs text-emerald-300' : 'text-xs text-white/40'}>
                                      {isActive ? 'Ativa' : ts.tenant.status === 'suspended' ? 'Suspensa' : 'Cancelada'}
                                    </span>
                                  </div>
                                </td>

                                {/* Membros */}
                                <td className="px-4 py-3 whitespace-nowrap">
                                  <div className="flex items-center gap-1.5 text-sm text-white/70">
                                    <Users className="w-3.5 h-3.5 text-white/30" />
                                    {ts.user_count}
                                  </div>
                                </td>

                                {/* Cadastro */}
                                <td className="px-4 py-3">
                                  <div className="min-w-[140px]">
                                    {isDone ? (
                                      <div className="flex items-center gap-1.5">
                                        <CheckCircle className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                                        <span className="text-xs text-emerald-300 font-medium">Completo</span>
                                      </div>
                                    ) : (
                                      <>
                                        <div className="flex items-center justify-between mb-1">
                                          <span className="text-[10px] text-white/50">{step}/5 etapas</span>
                                          <span className={`text-[10px] font-semibold ${stepPct >= 60 ? 'text-amber-300' : 'text-orange-400'}`}>
                                            {stepPct}%
                                          </span>
                                        </div>
                                        <div className="h-1 bg-white/[0.08] rounded-full overflow-hidden mb-1">
                                          <div
                                            className={`h-full rounded-full transition-all ${stepPct >= 80 ? 'bg-emerald-500' : stepPct >= 60 ? 'bg-amber-500' : 'bg-orange-500'}`}
                                            style={{ width: `${stepPct}%` }}
                                          />
                                        </div>
                                        <div className="text-[9px] text-white/30">Parou em: {stoppedAt}</div>
                                      </>
                                    )}
                                  </div>
                                </td>

                                {/* Data */}
                                <td className="px-4 py-3 whitespace-nowrap">
                                  <div className="text-[11px] text-white/40">
                                    {new Date(ts.tenant.created_at).toLocaleDateString('pt-BR')}
                                  </div>
                                  <div className="text-[10px] text-white/25">
                                    {new Date(ts.tenant.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                  </div>
                                </td>

                                {/* Ações */}
                                <td className="px-4 py-3">
                                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                      onClick={() => toggleTenantStatus(ts.tenant.id, ts.tenant.status)}
                                      className={`p-1.5 rounded-lg text-xs transition-all border
                                        ${isActive
                                          ? 'bg-red-500/10 border-red-500/20 text-red-400 hover:bg-red-500/20'
                                          : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20'
                                        }`}
                                      title={isActive ? 'Suspender' : 'Reativar'}
                                    >
                                      {isActive ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* ────────────── USERS ────────────── */}
            {tab === 'users' && (
              <>
                <div className="page-header">
                  <div>
                    <h1 className="page-title">Todos os Usuários</h1>
                    <p className="page-subtitle">{filteredUsers.length} usuários na plataforma</p>
                  </div>
                </div>

                <div className="glass-card overflow-hidden">
                  {loading ? (
                    <div className="p-8 flex items-center justify-center">
                      <div className="w-6 h-6 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
                    </div>
                  ) : filteredUsers.length === 0 ? (
                    <div className="p-12 text-center">
                      <Users className="w-12 h-12 mx-auto text-white/20 mb-3" />
                      <div className="text-white/50">Nenhum usuário encontrado</div>
                    </div>
                  ) : (
                    <table className="table-glass">
                      <thead>
                        <tr>
                          <th>Usuário</th>
                          <th>Corretora</th>
                          <th>Perfil</th>
                          <th>Status</th>
                          <th>Super Admin</th>
                          <th>Cadastrado em</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredUsers.map(u => {
                          const roleColors: Record<string, string> = { owner: 'badge-amber', admin: 'badge-red', manager: 'badge-blue', agent: 'badge-green', viewer: 'badge-gray' };
                          const roleLabels: Record<string, string> = { owner: 'Proprietário', admin: 'Admin', manager: 'Gerente', agent: 'Corretor', viewer: 'Visualizador' };
                          return (
                            <tr key={u.id}>
                              <td>
                                <div className="flex items-center gap-3">
                                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0
                                    ${u.is_super_admin ? 'bg-amber-500/20 border border-amber-500/30 text-amber-300' : 'bg-brand-600/20 border border-brand-500/20 text-brand-300'}`}>
                                    {u.is_super_admin ? <Crown className="w-4 h-4" /> : u.full_name?.charAt(0) ?? 'U'}
                                  </div>
                                  <div>
                                    <div className="text-sm font-medium text-white/90">{u.full_name || 'Sem nome'}</div>
                                    <div className="text-xs text-white/40">{u.email ?? '-'}</div>
                                  </div>
                                </div>
                              </td>
                              <td>
                                <div className="flex items-center gap-1.5 text-sm text-white/70">
                                  <Building2 className="w-3.5 h-3.5 text-white/30" />
                                  {u.tenant_name}
                                </div>
                              </td>
                              <td>
                                <span className={roleColors[u.role] ?? 'badge-gray'}>
                                  {roleLabels[u.role] ?? u.role}
                                </span>
                              </td>
                              <td>
                                <span className={u.active ? 'badge-green' : 'badge-gray'}>
                                  {u.active ? 'Ativo' : 'Inativo'}
                                </span>
                              </td>
                              <td>
                                {u.is_super_admin ? (
                                  <div className="flex items-center gap-1.5 text-amber-400">
                                    <Crown className="w-3.5 h-3.5" />
                                    <span className="text-xs font-semibold">Sim</span>
                                  </div>
                                ) : (
                                  <span className="text-xs text-white/30">—</span>
                                )}
                              </td>
                              <td>
                                <div className="text-xs text-white/40">
                                  {new Date(u.created_at).toLocaleDateString('pt-BR')}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>
              </>
            )}

            {/* ────────────── INSURERS ────────────── */}
            {tab === 'insurers' && (
              <InsurerManagementTab onRefresh={fetchData} />
            )}

            {/* ────────────── SYSTEM ────────────── */}
            {tab === 'system' && (
              <>
                <div>
                  <h1 className="page-title">Status do Sistema</h1>
                  <p className="page-subtitle">Monitoramento da infraestrutura da plataforma</p>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  {/* Services */}
                  <div className="glass-card p-5">
                    <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
                      <Activity className="w-4 h-4 text-emerald-400" />
                      Serviços
                    </h3>
                    <div className="space-y-2">
                      {[
                        { name: 'Supabase API',        status: 'online', latency: '12ms' },
                        { name: 'PostgreSQL',           status: 'online', latency: '4ms' },
                        { name: 'Auth Service',         status: 'online', latency: '8ms' },
                        { name: 'Storage (S3)',         status: 'online', latency: '32ms' },
                        { name: 'Realtime WS',          status: 'online', latency: '6ms' },
                        { name: 'Edge Functions',       status: 'online', latency: '45ms' },
                        { name: 'Integration Layer',    status: 'online', latency: '18ms' },
                        { name: 'Automation Engine',    status: 'online', latency: '22ms' },
                      ].map(svc => (
                        <div key={svc.name} className="flex items-center justify-between py-2.5 border-b border-white/[0.04] last:border-0">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse-soft" />
                            <span className="text-sm text-white/70">{svc.name}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-white/30">{svc.latency}</span>
                            <span className="badge-green">Online</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Database stats */}
                  <div className="glass-card p-5">
                    <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
                      <Database className="w-4 h-4 text-brand-400" />
                      Banco de Dados
                    </h3>
                    <div className="space-y-3">
                      {[
                        { label: 'Total de registros', value: fmt(kpis.total_clients + kpis.total_policies + kpis.total_users + kpis.total_tenants) },
                        { label: 'Tabelas', value: '30+' },
                        { label: 'RLS Policies', value: '120+' },
                        { label: 'Multi-tenant isolation', value: '100%' },
                        { label: 'Backups automáticos', value: 'Ativo (diário)' },
                        { label: 'Replicação', value: 'Habilitada' },
                        { label: 'SSL/TLS', value: 'Ativo' },
                        { label: 'Uptime (30d)', value: '99.9%' },
                      ].map(item => (
                        <div key={item.label} className="flex justify-between items-center py-2 border-b border-white/[0.04] last:border-0">
                          <span className="text-xs text-white/50">{item.label}</span>
                          <span className="text-xs font-semibold text-white/90">{item.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Security */}
                  <div className="glass-card p-5">
                    <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
                      <Shield className="w-4 h-4 text-amber-400" />
                      Segurança
                    </h3>
                    <div className="space-y-2">
                      {[
                        { label: 'Row Level Security',     ok: true },
                        { label: 'Tenant isolation',       ok: true },
                        { label: 'Password hashing (bcrypt)', ok: true },
                        { label: 'JWT authentication',     ok: true },
                        { label: 'HTTPS enforced',         ok: true },
                        { label: 'API rate limiting',      ok: true },
                        { label: 'CORS configurado',       ok: true },
                        { label: 'Audit logging',          ok: true },
                      ].map(item => (
                        <div key={item.label} className="flex items-center justify-between py-2 border-b border-white/[0.04] last:border-0">
                          <span className="text-xs text-white/60">{item.label}</span>
                          {item.ok
                            ? <CheckCircle className="w-4 h-4 text-emerald-400" />
                            : <XCircle className="w-4 h-4 text-red-400" />
                          }
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Integrations */}
                  <div className="glass-card p-5">
                    <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
                      <Zap className="w-4 h-4 text-cyan-400" />
                      Conectores Disponíveis
                    </h3>
                    <div className="space-y-2">
                      {['Porto Seguro','Tokio Marine','Azul Seguros','Allianz','HDI Seguros','Bradesco Seguros','Mapfre','SulAmérica','Liberty','Sompo','Chubb','Zurich'].map((ins, i) => (
                        <div key={ins} className="flex items-center justify-between py-1.5 border-b border-white/[0.04] last:border-0">
                          <span className="text-xs text-white/60">{ins}</span>
                          <span className={i < 9 ? 'badge-green' : 'badge-amber'}>
                            {i < 9 ? 'Disponível' : 'Beta'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </>
            )}

          </div>
        </main>
      </div>
    </div>
  );
}
