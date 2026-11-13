import React, { useEffect, useState } from 'react';
import {
  TrendingUp, DollarSign, FileText, AlertCircle, RefreshCw,
  Users, CheckSquare, ArrowUpRight, ArrowDownRight, Calendar,
  Clock, Target, Activity, ChevronRight, Zap
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface KPI {
  total_clients: number;
  active_policies: number;
  expiring_soon: number;
  pending_tasks: number;
  open_opportunities: number;
  monthly_premium: number;
  monthly_commissions: number;
}

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ComponentType<{ className?: string }>;
  trend?: number;
  color?: 'blue' | 'green' | 'amber' | 'red' | 'cyan';
  delay?: number;
}

function StatCard({ title, value, subtitle, icon: Icon, trend, color = 'blue', delay = 0 }: StatCardProps) {
  const colors = {
    blue:  { bg: 'bg-brand-500/10',   border: 'border-brand-500/20',  icon: 'text-brand-400',   glow: 'shadow-glass-glow' },
    green: { bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', icon: 'text-emerald-400', glow: 'shadow-glass-glow-green' },
    amber: { bg: 'bg-amber-500/10',   border: 'border-amber-500/20',  icon: 'text-amber-400',   glow: 'shadow-glass-glow-amber' },
    red:   { bg: 'bg-red-500/10',     border: 'border-red-500/20',    icon: 'text-red-400',     glow: '' },
    cyan:  { bg: 'bg-cyan-500/10',    border: 'border-cyan-500/20',   icon: 'text-cyan-400',    glow: '' },
  };
  const c = colors[color];

  return (
    <div
      className="glass-card p-5 animate-slide-up"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-start justify-between mb-4">
        <div className={`w-10 h-10 rounded-xl ${c.bg} border ${c.border} flex items-center justify-center`}>
          <Icon className={`w-5 h-5 ${c.icon}`} />
        </div>
        {trend !== undefined && (
          <div className={`flex items-center gap-1 text-xs font-medium ${trend >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {trend >= 0 ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
            {Math.abs(trend)}%
          </div>
        )}
      </div>
      <div className="text-2xl font-bold text-white">{value}</div>
      <div className="text-sm text-white/50 mt-0.5">{title}</div>
      {subtitle && <div className="text-xs text-white/30 mt-1">{subtitle}</div>}
    </div>
  );
}

function FunnelBar({ label, value, total, color }: { label: string; value: number; total: number; color: string }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-xs">
        <span className="text-white/60">{label}</span>
        <span className="text-white/40">{value} ({pct}%)</span>
      </div>
      <div className="h-2 bg-white/[0.06] rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all duration-700`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { profile } = useAuth();
  const [kpi, setKpi] = useState<KPI>({
    total_clients: 0, active_policies: 0, expiring_soon: 0,
    pending_tasks: 0, open_opportunities: 0,
    monthly_premium: 0, monthly_commissions: 0,
  });
  const [recentPolicies, setRecentPolicies] = useState<Array<{id:string;client?:{full_name:string};category:string;premium:number;end_date:string;status:string}>>([]);
  const [todayEvents, setTodayEvents] = useState<Array<{id:string;title:string;type:string;start_at:string;status:string}>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile) return;
    (async () => {
      const now = new Date().toISOString().split('T')[0];
      const startMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
      const in30 = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0];
      const todayStart = new Date().toISOString().split('T')[0] + 'T00:00:00';
      const todayEnd   = new Date().toISOString().split('T')[0] + 'T23:59:59';

      const [clients, activePolicies, expiring, pendingTasks, opportunities, monthPolicies, commissions, latest, events] = await Promise.all([
        supabase.from('propostaone_clients').select('id', { count: 'exact', head: true }),
        supabase.from('propostaone_policies').select('id', { count: 'exact', head: true }).eq('status', 'active'),
        supabase.from('propostaone_policies').select('id', { count: 'exact', head: true }).eq('status', 'active').gte('end_date', now).lte('end_date', in30),
        supabase.from('propostaone_events').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('propostaone_opportunities').select('id', { count: 'exact', head: true }).eq('status', 'open'),
        supabase.from('propostaone_policies').select('premium').gte('emission_date', startMonth).or(`emission_date.is.null,emission_date.gte.${startMonth}`),
        supabase.from('propostaone_commissions').select('net_value').gte('created_at', startMonth),
        supabase.from('propostaone_policies').select('id, category, premium, end_date, status, client:propostaone_clients(full_name)').order('created_at', { ascending: false }).limit(5),
        supabase.from('propostaone_events').select('id, title, type, start_at, status').gte('start_at', todayStart).lte('start_at', todayEnd).order('start_at').limit(8),
      ]);

      const monthPremium = (monthPolicies.data ?? []).reduce((s: number, p: { premium: number }) => s + (p.premium ?? 0), 0);
      const monthComm = (commissions.data ?? []).reduce((s: number, c: { net_value: number }) => s + (c.net_value ?? 0), 0);

      setKpi({
        total_clients: clients.count ?? 0,
        active_policies: activePolicies.count ?? 0,
        expiring_soon: expiring.count ?? 0,
        pending_tasks: pendingTasks.count ?? 0,
        open_opportunities: opportunities.count ?? 0,
        monthly_premium: monthPremium,
        monthly_commissions: monthComm,
      });

      setRecentPolicies((latest.data ?? []) as typeof recentPolicies);
      setTodayEvents((events.data ?? []) as typeof todayEvents);
      setLoading(false);
    })();
  }, [profile]);

  const fmt = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

  const categoryLabels: Record<string, string> = {
    auto: 'Auto', life: 'Vida', health: 'Saúde', property: 'Patrimonial',
    business: 'Empresarial', rural: 'Rural', other: 'Outros',
  };

  const statusBadge = (s: string) => {
    const map: Record<string, string> = {
      active: 'badge-green', proposal: 'badge-blue', expired: 'badge-red', cancelled: 'badge-gray',
    };
    const labels: Record<string, string> = { active: 'Ativa', proposal: 'Proposta', expired: 'Expirada', cancelled: 'Cancelada' };
    return <span className={map[s] ?? 'badge-gray'}>{labels[s] ?? s}</span>;
  };

  const eventTypeIcon = (t: string) => {
    const map: Record<string, string> = { call: '📞', visit: '🏢', appointment: '📅', renewal: '🔄', task: '✅', other: '📌' };
    return map[t] ?? '📌';
  };

  if (loading) {
    return (
      <div className="page-wrapper">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="glass-card p-5 h-28 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="page-wrapper">
      {/* Welcome */}
      <div>
        <h1 className="text-2xl font-bold text-white">
          Bom dia, <span className="text-gradient">{profile?.full_name?.split(' ')[0]}</span> 👋
        </h1>
        <p className="text-white/50 text-sm mt-0.5">
          {new Date().toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard title="Clientes Ativos" value={kpi.total_clients} icon={Users} color="blue" trend={8} delay={0} />
        <StatCard title="Apólices Ativas" value={kpi.active_policies} icon={FileText} color="green" trend={5} delay={50} />
        <StatCard title="Produção do Mês" value={fmt(kpi.monthly_premium)} icon={TrendingUp} color="cyan" trend={12} delay={100} />
        <StatCard title="Comissões do Mês" value={fmt(kpi.monthly_commissions)} icon={DollarSign} color="amber" trend={3} delay={150} />
        <StatCard title="Oportunidades Abertas" value={kpi.open_opportunities} icon={Target} color="blue" delay={200} />
        <StatCard title="Renovações Próximas" value={kpi.expiring_soon} subtitle="nos próximos 30 dias" icon={RefreshCw} color="amber" delay={250} />
        <StatCard title="Tarefas Pendentes" value={kpi.pending_tasks} icon={CheckSquare} color={kpi.pending_tasks > 10 ? 'red' : 'green'} delay={300} />
        <StatCard title="Atividades Hoje" value={todayEvents.length} icon={Activity} color="cyan" delay={350} />
      </div>

      {/* Bottom grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Policies */}
        <div className="lg:col-span-2 glass-card p-5 animate-slide-up" style={{ animationDelay: '100ms' }}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-white flex items-center gap-2">
              <FileText className="w-4 h-4 text-brand-400" />
              Apólices Recentes
            </h3>
            <button className="text-xs text-brand-400 hover:text-brand-300 flex items-center gap-1 transition-colors">
              Ver todas <ChevronRight className="w-3 h-3" />
            </button>
          </div>

          {recentPolicies.length === 0 ? (
            <div className="text-center py-8 text-white/40 text-sm">
              <FileText className="w-8 h-8 mx-auto mb-2 opacity-30" />
              Nenhuma apólice cadastrada ainda
            </div>
          ) : (
            <div className="space-y-2">
              {recentPolicies.map(p => (
                <div key={p.id} className="flex items-center gap-4 p-3 rounded-xl hover:bg-white/[0.03] transition-colors">
                  <div className="w-8 h-8 rounded-lg bg-brand-500/10 border border-brand-500/20 flex items-center justify-center flex-shrink-0">
                    <FileText className="w-4 h-4 text-brand-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-white/90 truncate">{(p.client as {full_name:string})?.full_name ?? '-'}</div>
                    <div className="text-xs text-white/40">{categoryLabels[p.category] ?? p.category}</div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="text-sm text-white/80">{fmt(p.premium)}</div>
                    <div className="text-[10px] text-white/30">
                      Vence {new Date(p.end_date).toLocaleDateString('pt-BR')}
                    </div>
                  </div>
                  {statusBadge(p.status)}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Today's Agenda + Funnel */}
        <div className="space-y-4">
          {/* Agenda */}
          <div className="glass-card p-5 animate-slide-up" style={{ animationDelay: '150ms' }}>
            <h3 className="font-semibold text-white flex items-center gap-2 mb-4">
              <Calendar className="w-4 h-4 text-brand-400" />
              Agenda de Hoje
            </h3>
            {todayEvents.length === 0 ? (
              <div className="text-center py-6 text-white/40 text-sm">
                <Clock className="w-7 h-7 mx-auto mb-2 opacity-30" />
                Nenhuma atividade hoje
              </div>
            ) : (
              <div className="space-y-2">
                {todayEvents.map(ev => (
                  <div key={ev.id} className="flex items-center gap-3 p-2.5 rounded-xl bg-white/[0.03]">
                    <span className="text-base">{eventTypeIcon(ev.type)}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium text-white/80 truncate">{ev.title}</div>
                      <div className="text-[10px] text-white/40">
                        {new Date(ev.start_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Funnel summary */}
          <div className="glass-card p-5 animate-slide-up" style={{ animationDelay: '200ms' }}>
            <h3 className="font-semibold text-white flex items-center gap-2 mb-4">
              <Zap className="w-4 h-4 text-amber-400" />
              Funil Comercial
            </h3>
            <div className="space-y-3">
              <FunnelBar label="Leads" value={Math.round(kpi.open_opportunities * 2.4)} total={Math.round(kpi.open_opportunities * 2.4)} color="bg-brand-500" />
              <FunnelBar label="Qualificados" value={Math.round(kpi.open_opportunities * 1.6)} total={Math.round(kpi.open_opportunities * 2.4)} color="bg-cyan-500" />
              <FunnelBar label="Propostas" value={Math.round(kpi.open_opportunities * 1.1)} total={Math.round(kpi.open_opportunities * 2.4)} color="bg-amber-500" />
              <FunnelBar label="Fechados" value={kpi.open_opportunities} total={Math.round(kpi.open_opportunities * 2.4)} color="bg-emerald-500" />
            </div>
          </div>
        </div>
      </div>

      {/* Renewal alerts */}
      {kpi.expiring_soon > 0 && (
        <div className="glass-card border border-amber-500/20 p-4 flex items-center gap-4 animate-slide-up bg-amber-500/5">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center flex-shrink-0">
            <AlertCircle className="w-5 h-5 text-amber-400" />
          </div>
          <div className="flex-1">
            <div className="text-sm font-semibold text-amber-300">
              {kpi.expiring_soon} apólice{kpi.expiring_soon > 1 ? 's' : ''} vencendo nos próximos 30 dias
            </div>
            <div className="text-xs text-amber-400/70 mt-0.5">Entre em contato com os clientes para renovação</div>
          </div>
          <button className="btn-glass text-amber-400 border-amber-500/20 text-xs">
            Ver apólices
          </button>
        </div>
      )}
    </div>
  );
}
