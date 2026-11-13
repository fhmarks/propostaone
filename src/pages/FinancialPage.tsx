import React, { useEffect, useState, useCallback } from 'react';
import {
  DollarSign, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight,
  Plus, Filter, ChevronDown, Loader2, X, CheckCircle, Clock, AlertCircle
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Commission, FinancialTransaction } from '../types';

const fmt = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

type FinTab = 'overview' | 'commissions' | 'transactions' | 'transfers';

const commStatusConfig: Record<string, { label: string; badge: string; icon: React.ComponentType<{className?:string}> }> = {
  pending:              { label: 'Pendente',     badge: 'badge-amber', icon: Clock },
  received:             { label: 'Recebida',     badge: 'badge-green', icon: CheckCircle },
  partially_received:   { label: 'Parcial',      badge: 'badge-blue',  icon: AlertCircle },
  cancelled:            { label: 'Cancelada',    badge: 'badge-red',   icon: X },
};

export default function FinancialPage() {
  const [tab, setTab] = useState<FinTab>('overview');
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [transactions, setTransactions] = useState<FinancialTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('this_month');

  const fetchData = useCallback(async () => {
    setLoading(true);
    const now = new Date();
    let start: string;
    if (period === 'this_month') start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    else if (period === 'last_month') start = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
    else start = new Date(now.getFullYear(), 0, 1).toISOString();

    const [commsRes, txRes] = await Promise.all([
      supabase.from('propostaone_commissions').select('*, policy:propostaone_policies(policy_number, category, premium), agent:propostaone_profiles(full_name)').gte('created_at', start).order('created_at', { ascending: false }).limit(50),
      supabase.from('propostaone_financial_transactions').select('*').gte('date', start.split('T')[0]).order('date', { ascending: false }).limit(50),
    ]);

    setCommissions((commsRes.data ?? []) as Commission[]);
    setTransactions((txRes.data ?? []) as FinancialTransaction[]);
    setLoading(false);
  }, [period]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const totalComm = commissions.reduce((s, c) => s + c.net_value, 0);
  const receivedComm = commissions.filter(c => c.status === 'received').reduce((s, c) => s + c.net_value, 0);
  const pendingComm = commissions.filter(c => c.status === 'pending').reduce((s, c) => s + c.net_value, 0);
  const income = transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const expenses = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);

  return (
    <div className="page-wrapper">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Financeiro</h1>
          <p className="page-subtitle">Comissões, recebimentos e fluxo de caixa</p>
        </div>
        <div className="flex items-center gap-3">
          <select className="input-glass w-40" value={period} onChange={e => setPeriod(e.target.value)}>
            <option value="this_month">Este mês</option>
            <option value="last_month">Mês anterior</option>
            <option value="this_year">Este ano</option>
          </select>
          <button className="btn-primary">
            <Plus className="w-4 h-4" />
            Lançamento
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Comissões', value: fmt(totalComm), icon: DollarSign, color: 'blue', sub: `${commissions.length} registros` },
          { label: 'Comissões Recebidas', value: fmt(receivedComm), icon: CheckCircle, color: 'green', sub: `${commissions.filter(c=>c.status==='received').length} apólices` },
          { label: 'A Receber', value: fmt(pendingComm), icon: Clock, color: 'amber', sub: `${commissions.filter(c=>c.status==='pending').length} pendentes` },
          { label: 'Resultado do Período', value: fmt(income - expenses), icon: income >= expenses ? TrendingUp : TrendingDown, color: income >= expenses ? 'green' : 'red', sub: `Receitas - Despesas` },
        ].map((kpi, i) => {
          const Icon = kpi.icon;
          const colorMap: Record<string, string> = { blue: 'bg-brand-500/10 border-brand-500/20 text-brand-400', green: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400', amber: 'bg-amber-500/10 border-amber-500/20 text-amber-400', red: 'bg-red-500/10 border-red-500/20 text-red-400' };
          return (
            <div key={i} className="glass-card p-5 animate-slide-up" style={{ animationDelay: `${i * 50}ms` }}>
              <div className={`w-10 h-10 rounded-xl border flex items-center justify-center mb-3 ${colorMap[kpi.color]}`}>
                <Icon className="w-5 h-5" />
              </div>
              <div className="text-xl font-bold text-white">{kpi.value}</div>
              <div className="text-sm text-white/50 mt-0.5">{kpi.label}</div>
              <div className="text-xs text-white/30 mt-1">{kpi.sub}</div>
            </div>
          );
        })}
      </div>

      {/* Tabs */}
      <div className="glass-card p-1 flex gap-1 w-fit">
        {([['overview','Visão Geral'],['commissions','Comissões'],['transactions','Lançamentos'],['transfers','Repasses']] as [FinTab,string][]).map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)} className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${tab === id ? 'bg-brand-600/30 text-white border border-brand-500/25' : 'text-white/50 hover:text-white/80'}`}>
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 text-brand-400 animate-spin" /></div>
      ) : tab === 'commissions' ? (
        <div className="glass-card overflow-hidden">
          {commissions.length === 0 ? (
            <div className="p-12 text-center">
              <DollarSign className="w-12 h-12 mx-auto text-white/20 mb-3" />
              <div className="text-white/50">Nenhuma comissão no período</div>
            </div>
          ) : (
            <table className="table-glass">
              <thead>
                <tr>
                  <th>Apólice</th>
                  <th>Tipo</th>
                  <th>Bruto</th>
                  <th>Líquido</th>
                  <th>Parcela</th>
                  <th>Vencimento</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {commissions.map(c => {
                  const cfg = commStatusConfig[c.status] ?? commStatusConfig.pending;
                  const Icon = cfg.icon;
                  const policy = c.policy as { policy_number?: string; category?: string };
                  return (
                    <tr key={c.id}>
                      <td>
                        <div className="text-sm text-white/80">{policy?.policy_number ?? 'Sem número'}</div>
                        <div className="text-xs text-white/40 capitalize">{policy?.category ?? '-'}</div>
                      </td>
                      <td><div className="text-xs text-white/70 capitalize">{c.type}</div></td>
                      <td><div className="text-sm font-medium text-white/90">{fmt(c.gross_value)}</div></td>
                      <td><div className="text-sm font-bold text-emerald-400">{fmt(c.net_value)}</div></td>
                      <td><div className="text-xs text-white/60">{c.installment_number}/{c.total_installments}</div></td>
                      <td><div className="text-xs text-white/60">{c.due_date ? new Date(c.due_date).toLocaleDateString('pt-BR') : '-'}</div></td>
                      <td>
                        <span className={cfg.badge}>{cfg.label}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      ) : tab === 'transactions' ? (
        <div className="glass-card overflow-hidden">
          {transactions.length === 0 ? (
            <div className="p-12 text-center">
              <TrendingUp className="w-12 h-12 mx-auto text-white/20 mb-3" />
              <div className="text-white/50">Nenhum lançamento no período</div>
            </div>
          ) : (
            <table className="table-glass">
              <thead>
                <tr>
                  <th>Descrição</th>
                  <th>Categoria</th>
                  <th>Data</th>
                  <th>Tipo</th>
                  <th>Valor</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map(t => (
                  <tr key={t.id}>
                    <td><div className="text-sm text-white/80">{t.description}</div></td>
                    <td><div className="text-xs text-white/50">{t.category}</div></td>
                    <td><div className="text-xs text-white/60">{new Date(t.date).toLocaleDateString('pt-BR')}</div></td>
                    <td>
                      <div className={`flex items-center gap-1 text-xs font-medium ${t.type === 'income' ? 'text-emerald-400' : 'text-red-400'}`}>
                        {t.type === 'income' ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                        {t.type === 'income' ? 'Receita' : t.type === 'expense' ? 'Despesa' : 'Transferência'}
                      </div>
                    </td>
                    <td>
                      <div className={`text-sm font-bold ${t.type === 'income' ? 'text-emerald-400' : 'text-red-400'}`}>
                        {t.type === 'income' ? '+' : '-'}{fmt(t.amount)}
                      </div>
                    </td>
                    <td>
                      <span className={t.status === 'completed' ? 'badge-green' : t.status === 'pending' ? 'badge-amber' : 'badge-red'}>
                        {t.status === 'completed' ? 'Realizado' : t.status === 'pending' ? 'Pendente' : 'Cancelado'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      ) : tab === 'transfers' ? (
        <div className="glass-card p-12 text-center">
          <DollarSign className="w-12 h-12 mx-auto text-white/20 mb-3" />
          <div className="text-white/50">Nenhum repasse cadastrado</div>
          <div className="text-white/30 text-sm mt-1">Os repasses para produtores aparecerão aqui</div>
        </div>
      ) : (
        /* Overview */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Commission breakdown */}
          <div className="glass-card p-5">
            <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-brand-400" />
              Comissões por Status
            </h3>
            {(['received','pending','partially_received','cancelled'] as const).map(s => {
              const val = commissions.filter(c => c.status === s).reduce((sum, c) => sum + c.net_value, 0);
              const pct = totalComm > 0 ? (val / totalComm) * 100 : 0;
              const cfg = commStatusConfig[s];
              return (
                <div key={s} className="mb-3">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-white/60">{cfg.label}</span>
                    <span className="text-white/50">{fmt(val)}</span>
                  </div>
                  <div className="h-2 bg-white/[0.06] rounded-full">
                    <div
                      className={`h-full rounded-full ${s === 'received' ? 'bg-emerald-500' : s === 'pending' ? 'bg-amber-500' : s === 'partially_received' ? 'bg-brand-500' : 'bg-red-500'}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Cash flow */}
          <div className="glass-card p-5">
            <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              Fluxo do Período
            </h3>
            <div className="space-y-3">
              {[
                { label: 'Receitas', value: income, color: 'bg-emerald-500', icon: ArrowUpRight, textColor: 'text-emerald-400' },
                { label: 'Despesas', value: expenses, color: 'bg-red-500', icon: ArrowDownRight, textColor: 'text-red-400' },
              ].map(item => {
                const Icon = item.icon;
                return (
                  <div key={item.label} className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03]">
                    <Icon className={`w-5 h-5 ${item.textColor}`} />
                    <div className="flex-1">
                      <div className="text-xs text-white/50">{item.label}</div>
                      <div className={`text-lg font-bold ${item.textColor}`}>{fmt(item.value)}</div>
                    </div>
                  </div>
                );
              })}
              <div className="border-t border-white/[0.06] pt-3 flex items-center justify-between">
                <span className="text-sm text-white/50">Resultado</span>
                <span className={`text-lg font-bold ${income >= expenses ? 'text-emerald-400' : 'text-red-400'}`}>
                  {fmt(income - expenses)}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
