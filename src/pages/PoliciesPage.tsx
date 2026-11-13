import React, { useEffect, useState, useCallback } from 'react';
import {
  Plus, Search, Filter, FileText, AlertCircle, RefreshCw,
  ChevronDown, Loader2, X, Calendar, DollarSign, Building2,
  Edit3, Trash2, Eye, CheckCircle, XCircle, Clock
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Policy, Client, Insurer } from '../types';

const statusConfig: Record<string, { label: string; badge: string }> = {
  proposal:  { label: 'Proposta',   badge: 'badge-blue' },
  active:    { label: 'Ativa',      badge: 'badge-green' },
  renewed:   { label: 'Renovada',   badge: 'badge-cyan' },
  cancelled: { label: 'Cancelada',  badge: 'badge-red' },
  expired:   { label: 'Expirada',   badge: 'badge-gray' },
  suspended: { label: 'Suspensa',   badge: 'badge-amber' },
};

const categoryLabels: Record<string, string> = {
  auto: 'Auto', life: 'Vida', health: 'Saúde', property: 'Patrimonial',
  business: 'Empresarial', rural: 'Rural', transport: 'Transporte', liability: 'RC', other: 'Outros',
};

const fmt = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

interface PolicyFormProps {
  policy?: Policy;
  clients: Client[];
  insurers: Insurer[];
  onClose: () => void;
  onSaved: () => void;
}

function PolicyForm({ policy, clients, insurers, onClose, onSaved }: PolicyFormProps) {
  const today = new Date().toISOString().split('T')[0];
  const nextYear = new Date(Date.now() + 365 * 86400000).toISOString().split('T')[0];
  const [form, setForm] = useState({
    client_id: policy?.client_id ?? '',
    insurer_id: policy?.insurer_id ?? '',
    category: policy?.category ?? 'auto',
    status: policy?.status ?? 'proposal',
    policy_number: policy?.policy_number ?? '',
    premium: policy?.premium?.toString() ?? '',
    insured_value: policy?.insured_value?.toString() ?? '',
    commission_rate: policy?.commission_rate?.toString() ?? '',
    start_date: policy?.start_date ?? today,
    end_date: policy?.end_date ?? nextYear,
    installments: policy?.installments?.toString() ?? '1',
    payment_method: policy?.payment_method ?? '',
    insured_object: policy?.insured_object ?? '',
    notes: policy?.notes ?? '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function save() {
    if (!form.client_id) { setError('Selecione um cliente.'); return; }
    if (!form.premium) { setError('Informe o prêmio.'); return; }
    setSaving(true);

    const premium = parseFloat(form.premium) || 0;
    const commRate = parseFloat(form.commission_rate) || 0;
    const commValue = premium * (commRate / 100);

    const payload = {
      ...form,
      premium,
      insured_value: parseFloat(form.insured_value) || null,
      commission_rate: commRate,
      commission_value: commValue,
      installments: parseInt(form.installments) || 1,
      insurer_id: form.insurer_id || null,
      insured_value_num: undefined,
    };

    const { error: err } = policy
      ? await supabase.from('propostaone_policies').update(payload).eq('id', policy.id)
      : await supabase.from('propostaone_policies').insert(payload);

    if (err) setError(err.message);
    else { onSaved(); onClose(); }
    setSaving(false);
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-content">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-semibold text-white">{policy ? 'Editar Apólice' : 'Nova Apólice'}</h3>
          <button onClick={onClose} className="text-white/40 hover:text-white transition-colors"><X className="w-5 h-5" /></button>
        </div>

        {error && <div className="mb-4 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{error}</div>}

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="block text-xs text-white/60 mb-1.5 font-medium">Cliente *</label>
              <select className="input-glass" value={form.client_id} onChange={e => setForm(p => ({ ...p, client_id: e.target.value }))}>
                <option value="">Selecionar cliente...</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.full_name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-white/60 mb-1.5 font-medium">Seguradora</label>
              <select className="input-glass" value={form.insurer_id} onChange={e => setForm(p => ({ ...p, insurer_id: e.target.value }))}>
                <option value="">Selecionar...</option>
                {insurers.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-white/60 mb-1.5 font-medium">Ramo</label>
              <select className="input-glass" value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value as Policy['category'] }))}>
                {Object.entries(categoryLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-white/60 mb-1.5 font-medium">Nº da Apólice</label>
              <input className="input-glass" value={form.policy_number} onChange={e => setForm(p => ({ ...p, policy_number: e.target.value }))} placeholder="000000000" />
            </div>
            <div>
              <label className="block text-xs text-white/60 mb-1.5 font-medium">Status</label>
              <select className="input-glass" value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value as Policy['status'] }))}>
                {Object.entries(statusConfig).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-white/60 mb-1.5 font-medium">Prêmio (R$) *</label>
              <input type="number" className="input-glass" value={form.premium} onChange={e => setForm(p => ({ ...p, premium: e.target.value }))} placeholder="0,00" />
            </div>
            <div>
              <label className="block text-xs text-white/60 mb-1.5 font-medium">Valor Segurado (R$)</label>
              <input type="number" className="input-glass" value={form.insured_value} onChange={e => setForm(p => ({ ...p, insured_value: e.target.value }))} placeholder="0,00" />
            </div>
            <div>
              <label className="block text-xs text-white/60 mb-1.5 font-medium">Início Vigência</label>
              <input type="date" className="input-glass" value={form.start_date} onChange={e => setForm(p => ({ ...p, start_date: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs text-white/60 mb-1.5 font-medium">Fim Vigência</label>
              <input type="date" className="input-glass" value={form.end_date} onChange={e => setForm(p => ({ ...p, end_date: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs text-white/60 mb-1.5 font-medium">Comissão (%)</label>
              <input type="number" className="input-glass" value={form.commission_rate} onChange={e => setForm(p => ({ ...p, commission_rate: e.target.value }))} placeholder="15" />
            </div>
            <div>
              <label className="block text-xs text-white/60 mb-1.5 font-medium">Parcelas</label>
              <input type="number" min="1" max="12" className="input-glass" value={form.installments} onChange={e => setForm(p => ({ ...p, installments: e.target.value }))} />
            </div>
            <div className="col-span-2">
              <label className="block text-xs text-white/60 mb-1.5 font-medium">Objeto Segurado</label>
              <input className="input-glass" value={form.insured_object} onChange={e => setForm(p => ({ ...p, insured_object: e.target.value }))} placeholder="Ex: Honda Civic 2023, Apto 201..." />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button onClick={onClose} className="btn-glass flex-1 justify-center">Cancelar</button>
            <button onClick={save} disabled={saving} className="btn-primary flex-1 justify-center">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Salvar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PoliciesPage() {
  const [policies, setPolicies] = useState<(Policy & { client?: Client; insurer?: Insurer })[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [insurers, setInsurers] = useState<Insurer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showForm, setShowForm] = useState(false);
  const [editPolicy, setEditPolicy] = useState<Policy | undefined>();
  const [tab, setTab] = useState<'all' | 'expiring' | 'claims'>('all');

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const in30 = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0];

    let q = supabase.from('propostaone_policies').select('*, client:propostaone_clients(id, full_name, phone, email), insurer:propostaone_insurers(id, name)').order('created_at', { ascending: false }).limit(50);
    if (statusFilter !== 'all') q = q.eq('status', statusFilter);
    if (tab === 'expiring') q = q.eq('status', 'active').lte('end_date', in30).gte('end_date', new Date().toISOString().split('T')[0]);

    const [policiesRes, clientsRes, insurersRes] = await Promise.all([
      q,
      supabase.from('propostaone_clients').select('id, full_name').order('full_name').limit(100),
      supabase.from('propostaone_insurers').select('id, name').order('name').limit(50),
    ]);

    setPolicies((policiesRes.data ?? []) as typeof policies);
    setClients((clientsRes.data ?? []) as Client[]);
    setInsurers((insurersRes.data ?? []) as Insurer[]);
    setLoading(false);
  }, [statusFilter, tab]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  async function deletePolicy(id: string) {
    if (!confirm('Excluir esta apólice?')) return;
    await supabase.from('propostaone_policies').delete().eq('id', id);
    fetchAll();
  }

  const filtered = policies.filter(p =>
    !search || p.policy_number?.includes(search) || (p.client as { full_name: string })?.full_name?.toLowerCase().includes(search.toLowerCase())
  );

  const in30 = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0];
  const expiringCount = policies.filter(p => p.status === 'active' && p.end_date <= in30).length;

  return (
    <div className="page-wrapper">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Gestão de Apólices</h1>
          <p className="page-subtitle">{policies.length} apólices cadastradas</p>
        </div>
        <button onClick={() => { setEditPolicy(undefined); setShowForm(true); }} className="btn-primary">
          <Plus className="w-4 h-4" />
          Nova Apólice
        </button>
      </div>

      {/* Renewal alert */}
      {expiringCount > 0 && (
        <div className="glass-card border border-amber-500/20 p-4 flex items-center gap-3 bg-amber-500/5">
          <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0" />
          <span className="text-sm text-amber-300 font-medium">{expiringCount} apólice{expiringCount > 1 ? 's' : ''} vencendo em 30 dias</span>
          <button onClick={() => setTab('expiring')} className="ml-auto text-xs text-amber-400 hover:text-amber-300 transition-colors flex items-center gap-1">
            Ver apólices <ChevronDown className="w-3 h-3 rotate-[-90deg]" />
          </button>
        </div>
      )}

      {/* Tabs + Filters */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="glass-card p-1 flex gap-1">
          {([['all','Todas'],['expiring','Renovações'],['claims','Sinistros']] as [typeof tab, string][]).map(([id, label]) => (
            <button key={id} onClick={() => setTab(id)} className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${tab === id ? 'bg-brand-600/30 text-white border border-brand-500/25' : 'text-white/50 hover:text-white/80'}`}>
              {label}
              {id === 'expiring' && expiringCount > 0 && <span className="ml-1.5 text-xs bg-amber-500/30 text-amber-300 px-1.5 py-0.5 rounded-full">{expiringCount}</span>}
            </button>
          ))}
        </div>

        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
          <input className="input-glass pl-9" placeholder="Buscar apólice ou cliente..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>

        <select className="input-glass w-36" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="all">Todos status</option>
          {Object.entries(statusConfig).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="glass-card overflow-hidden">
        {loading ? (
          <div className="p-8 flex items-center justify-center"><Loader2 className="w-6 h-6 text-brand-400 animate-spin" /></div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <FileText className="w-12 h-12 mx-auto text-white/20 mb-3" />
            <div className="text-white/50 font-medium">Nenhuma apólice encontrada</div>
            <div className="text-white/30 text-sm mt-1">Cadastre a primeira apólice da sua corretora</div>
          </div>
        ) : (
          <table className="table-glass">
            <thead>
              <tr>
                <th>Apólice</th>
                <th>Cliente</th>
                <th>Seguradora / Ramo</th>
                <th>Prêmio</th>
                <th>Vigência</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(p => {
                const isExpiring = p.status === 'active' && p.end_date <= in30;
                return (
                  <tr key={p.id} className={isExpiring ? 'bg-amber-500/5' : ''}>
                    <td>
                      <div>
                        <div className="font-medium text-white/90 text-sm">{p.policy_number ?? 'Sem número'}</div>
                        <div className="text-xs text-white/40">{categoryLabels[p.category] ?? p.category}</div>
                      </div>
                    </td>
                    <td>
                      <div className="text-sm text-white/80">{(p.client as { full_name: string })?.full_name ?? '-'}</div>
                    </td>
                    <td>
                      <div className="flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-white/30" />
                        <span className="text-sm text-white/70">{(p.insurer as { name: string })?.name ?? 'Não definida'}</span>
                      </div>
                    </td>
                    <td>
                      <div>
                        <div className="text-sm font-semibold text-white/90">{fmt(p.premium)}</div>
                        <div className="text-xs text-white/40">{p.commission_rate}% comissão</div>
                      </div>
                    </td>
                    <td>
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-white/30" />
                        <div>
                          <div className="text-xs text-white/70">{new Date(p.start_date).toLocaleDateString('pt-BR')}</div>
                          <div className={`text-xs ${isExpiring ? 'text-amber-400 font-semibold' : 'text-white/40'}`}>
                            {isExpiring && '⚠️ '}{new Date(p.end_date).toLocaleDateString('pt-BR')}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className={statusConfig[p.status]?.badge ?? 'badge-gray'}>
                        {statusConfig[p.status]?.label ?? p.status}
                      </span>
                    </td>
                    <td>
                      <div className="flex items-center gap-1">
                        <button className="w-7 h-7 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] flex items-center justify-center text-white/40 hover:text-white/80 transition-colors">
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => { setEditPolicy(p as Policy); setShowForm(true); }} className="w-7 h-7 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] flex items-center justify-center text-white/40 hover:text-white/80 transition-colors">
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => deletePolicy(p.id)} className="w-7 h-7 rounded-lg bg-red-500/10 hover:bg-red-500/20 flex items-center justify-center text-red-400/60 hover:text-red-400 transition-colors">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {showForm && (
        <PolicyForm
          policy={editPolicy}
          clients={clients}
          insurers={insurers}
          onClose={() => setShowForm(false)}
          onSaved={fetchAll}
        />
      )}
    </div>
  );
}
