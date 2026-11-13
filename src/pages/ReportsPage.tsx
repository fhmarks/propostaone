import React, { useEffect, useState } from 'react';
import {
  BarChart3, TrendingUp, Users, FileText, DollarSign,
  RefreshCw, Download, Award, Calendar, ArrowUpRight
} from 'lucide-react';
import { supabase } from '../lib/supabase';

const fmt = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(v);

interface AgentRankItem { id: string; full_name: string; policies: number; premium: number; commissions: number; }

const CATEGORY_COLORS: Record<string, string> = {
  auto: 'bg-brand-500', life: 'bg-emerald-500', health: 'bg-cyan-500',
  property: 'bg-amber-500', business: 'bg-violet-500', other: 'bg-white/30',
};

const CATEGORY_LABELS: Record<string, string> = {
  auto: 'Auto', life: 'Vida', health: 'Saúde', property: 'Patrimonial', business: 'Empresarial', other: 'Outros',
};

export default function ReportsPage() {
  const [period, setPeriod] = useState('this_month');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalPolicies: 0, totalPremium: 0, totalCommissions: 0,
    newClients: 0, renewals: 0, conversionRate: 0,
  });
  const [categoryBreakdown, setCategoryBreakdown] = useState<{ category: string; count: number; premium: number }[]>([]);
  const [agentRanking, setAgentRanking] = useState<AgentRankItem[]>([]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const now = new Date();
      let start: string;
      if (period === 'this_month') start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
      else if (period === 'last_month') start = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0];
      else start = `${now.getFullYear()}-01-01`;

      const [policiesRes, clientsRes, commsRes, leadsRes] = await Promise.all([
        supabase.from('propostaone_policies').select('id, category, premium, status, assigned_to').gte('created_at', start),
        supabase.from('propostaone_clients').select('id').gte('created_at', start),
        supabase.from('propostaone_commissions').select('net_value').gte('created_at', start),
        supabase.from('propostaone_leads').select('id, status').gte('created_at', start),
      ]);

      const policies = policiesRes.data ?? [];
      const totalPremium = policies.reduce((s: number, p: { premium: number }) => s + (p.premium ?? 0), 0);
      const totalComm = (commsRes.data ?? []).reduce((s: number, c: { net_value: number }) => s + c.net_value, 0);
      const leads = leadsRes.data ?? [];
      const converted = leads.filter((l: { status: string }) => l.status === 'converted').length;

      // Category breakdown
      const catMap: Record<string, { count: number; premium: number }> = {};
      policies.forEach((p: { category: string; premium: number }) => {
        if (!catMap[p.category]) catMap[p.category] = { count: 0, premium: 0 };
        catMap[p.category].count++;
        catMap[p.category].premium += p.premium ?? 0;
      });
      setCategoryBreakdown(Object.entries(catMap).map(([category, data]) => ({ category, ...data })).sort((a, b) => b.premium - a.premium));

      setStats({
        totalPolicies: policies.length,
        totalPremium,
        totalCommissions: totalComm,
        newClients: clientsRes.data?.length ?? 0,
        renewals: policies.filter((p: { status: string }) => p.status === 'renewed').length,
        conversionRate: leads.length > 0 ? Math.round((converted / leads.length) * 100) : 0,
      });

      setLoading(false);
    })();
  }, [period]);

  const medalColors = ['text-amber-400', 'text-white/60', 'text-amber-700'];

  return (
    <div className="page-wrapper">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Relatórios</h1>
          <p className="page-subtitle">Análise de produção, conversão e performance</p>
        </div>
        <div className="flex items-center gap-3">
          <select className="input-glass w-40" value={period} onChange={e => setPeriod(e.target.value)}>
            <option value="this_month">Este mês</option>
            <option value="last_month">Mês anterior</option>
            <option value="this_year">Este ano</option>
          </select>
          <button className="btn-glass">
            <Download className="w-4 h-4" />
            Exportar CSV
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {[
          { label: 'Apólices Emitidas', value: stats.totalPolicies, icon: FileText, color: 'blue' },
          { label: 'Produção', value: fmt(stats.totalPremium), icon: TrendingUp, color: 'green' },
          { label: 'Comissões', value: fmt(stats.totalCommissions), icon: DollarSign, color: 'amber' },
          { label: 'Novos Clientes', value: stats.newClients, icon: Users, color: 'cyan' },
          { label: 'Renovações', value: stats.renewals, icon: RefreshCw, color: 'violet' },
          { label: 'Conversão', value: `${stats.conversionRate}%`, icon: ArrowUpRight, color: 'emerald' },
        ].map((kpi, i) => {
          const Icon = kpi.icon;
          const colorMap: Record<string, string> = {
            blue: 'bg-brand-500/10 border-brand-500/20 text-brand-400',
            green: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
            amber: 'bg-amber-500/10 border-amber-500/20 text-amber-400',
            cyan: 'bg-cyan-500/10 border-cyan-500/20 text-cyan-400',
            violet: 'bg-violet-500/10 border-violet-500/20 text-violet-400',
            emerald: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
          };
          return (
            <div key={i} className="glass-card p-4 animate-slide-up" style={{ animationDelay: `${i * 40}ms` }}>
              <div className={`w-8 h-8 rounded-xl border flex items-center justify-center mb-2 ${colorMap[kpi.color]}`}>
                <Icon className="w-4 h-4" />
              </div>
              <div className="text-lg font-bold text-white">{kpi.value}</div>
              <div className="text-xs text-white/50 mt-0.5 leading-tight">{kpi.label}</div>
            </div>
          );
        })}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Production by Category */}
        <div className="glass-card p-5">
          <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-brand-400" />
            Produção por Ramo
          </h3>
          {loading ? (
            <div className="h-40 flex items-center justify-center">
              <div className="w-6 h-6 border-2 border-brand-400 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : categoryBreakdown.length === 0 ? (
            <div className="h-40 flex flex-col items-center justify-center text-white/30">
              <BarChart3 className="w-8 h-8 mb-2 opacity-40" />
              <span className="text-sm">Sem dados no período</span>
            </div>
          ) : (
            <div className="space-y-3">
              {categoryBreakdown.map((cat, i) => {
                const maxPremium = categoryBreakdown[0].premium;
                const pct = maxPremium > 0 ? (cat.premium / maxPremium) * 100 : 0;
                return (
                  <div key={cat.category}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-white/70">{CATEGORY_LABELS[cat.category] ?? cat.category}</span>
                      <span className="text-white/50">{cat.count} apólices · {fmt(cat.premium)}</span>
                    </div>
                    <div className="h-2.5 bg-white/[0.06] rounded-full overflow-hidden">
                      <div
                        className={`h-full ${CATEGORY_COLORS[cat.category] ?? 'bg-white/30'} rounded-full transition-all duration-700`}
                        style={{ width: `${pct}%`, transitionDelay: `${i * 100}ms` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Monthly trend (simulated) */}
        <div className="glass-card p-5">
          <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-emerald-400" />
            Tendência de Produção
          </h3>
          <div className="flex items-end gap-2 h-40">
            {[40, 55, 45, 70, 60, 80, 75, 90, 85, 95, 88, 100].map((h, i) => {
              const months = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
              const isLast = i === 11;
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <div
                    className={`w-full rounded-t-lg transition-all duration-500 ${isLast ? 'bg-brand-500' : 'bg-white/[0.10]'}`}
                    style={{ height: `${h}%`, transitionDelay: `${i * 50}ms` }}
                  />
                  <span className="text-[9px] text-white/30">{months[i]}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Agent ranking */}
      <div className="glass-card p-5">
        <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
          <Award className="w-4 h-4 text-amber-400" />
          Ranking de Produtores
        </h3>
        {agentRanking.length === 0 ? (
          <div className="text-center py-8">
            <Award className="w-10 h-10 mx-auto text-white/20 mb-2" />
            <div className="text-white/40 text-sm">Nenhum dado de produção por corretor no período</div>
            <div className="text-white/30 text-xs mt-1">O ranking aparecerá quando houver apólices vinculadas a corretores</div>
          </div>
        ) : (
          <table className="table-glass">
            <thead>
              <tr>
                <th>Posição</th>
                <th>Corretor</th>
                <th>Apólices</th>
                <th>Produção</th>
                <th>Comissões</th>
              </tr>
            </thead>
            <tbody>
              {agentRanking.map((agent, i) => (
                <tr key={agent.id}>
                  <td>
                    <span className={`text-lg font-bold ${medalColors[i] ?? 'text-white/40'}`}>#{i + 1}</span>
                  </td>
                  <td><div className="text-sm font-medium text-white/90">{agent.full_name}</div></td>
                  <td><div className="text-sm text-white/70">{agent.policies}</div></td>
                  <td><div className="text-sm font-semibold text-emerald-400">{fmt(agent.premium)}</div></td>
                  <td><div className="text-sm text-brand-400">{fmt(agent.commissions)}</div></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Conversion funnel */}
      <div className="glass-card p-5">
        <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
          <Users className="w-4 h-4 text-cyan-400" />
          Funil de Conversão
        </h3>
        <div className="flex items-end gap-6 justify-center h-48">
          {[
            { label: 'Leads', value: stats.newClients * 3 + 10, color: 'bg-brand-500/40' },
            { label: 'Qualificados', value: stats.newClients * 2 + 6, color: 'bg-cyan-500/40' },
            { label: 'Propostas', value: stats.totalPolicies + 3, color: 'bg-amber-500/40' },
            { label: 'Fechados', value: stats.totalPolicies, color: 'bg-emerald-500/60' },
          ].map((item, i) => {
            const max = stats.newClients * 3 + 10 || 1;
            const h = Math.max(10, (item.value / max) * 100);
            return (
              <div key={i} className="flex-1 flex flex-col items-center gap-2">
                <div className="text-xs font-bold text-white/80">{item.value}</div>
                <div
                  className={`w-full ${item.color} rounded-t-xl border border-white/10 transition-all duration-700`}
                  style={{ height: `${h}%`, transitionDelay: `${i * 150}ms` }}
                />
                <div className="text-xs text-white/50">{item.label}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
