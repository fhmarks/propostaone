import React, { useState } from 'react';
import {
  Settings, Building2, Users, Bell, Key, Webhook,
  Shield, CreditCard, Save, Loader2, X, Plus, Trash2,
  Eye, EyeOff, Edit3, CheckCircle
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

type SettingsTab = 'company' | 'users' | 'notifications' | 'api' | 'plan';

export default function SettingsPage() {
  const { tenant, profile, refreshProfile } = useAuth();
  const [tab, setTab] = useState<SettingsTab>('company');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [form, setForm] = useState({
    name: tenant?.name ?? '',
    cnpj: tenant?.cnpj ?? '',
    email: tenant?.email ?? '',
    phone: tenant?.phone ?? '',
    address: tenant?.address ?? '',
    city: tenant?.city ?? '',
    state: tenant?.state ?? '',
  });

  async function saveCompany() {
    if (!tenant) return;
    setSaving(true);
    await supabase.from('propostaone_tenants').update(form).eq('id', tenant.id);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
    setSaving(false);
  }

  const planConfig: Record<string, { label: string; price: string; features: string[]; color: string }> = {
    free:         { label: 'Gratuito',     price: 'R$ 0/mês',     features: ['Até 50 clientes', '10 apólices', '1 usuário'],                                  color: 'border-white/20' },
    starter:      { label: 'Starter',      price: 'R$ 99/mês',    features: ['Até 500 clientes', '200 apólices', '3 usuários', 'Automações básicas'],          color: 'border-brand-500/40' },
    professional: { label: 'Professional', price: 'R$ 249/mês',   features: ['Clientes ilimitados', 'Apólices ilimitadas', '10 usuários', 'Marketplace'],      color: 'border-cyan-500/40' },
    enterprise:   { label: 'Enterprise',   price: 'Sob consulta', features: ['Tudo ilimitado', 'SLA dedicado', 'Suporte 24h', 'Personalização', 'API própria'], color: 'border-amber-500/40' },
  };

  return (
    <div className="page-wrapper">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Configurações</h1>
          <p className="page-subtitle">Gerencie sua corretora e preferências</p>
        </div>
      </div>

      <div className="flex gap-6">
        {/* Sidebar */}
        <div className="w-52 flex-shrink-0">
          <div className="glass-card p-2 space-y-1">
            {([
              ['company', 'Dados da Empresa', Building2],
              ['users', 'Usuários', Users],
              ['notifications', 'Notificações', Bell],
              ['api', 'API & Webhooks', Webhook],
              ['plan', 'Plano & Assinatura', CreditCard],
            ] as [SettingsTab, string, React.ComponentType<{className?:string}>][]).map(([id, label, Icon]) => (
              <button
                key={id}
                onClick={() => setTab(id)}
                className={tab === id ? 'nav-item-active w-full' : 'nav-item w-full'}
              >
                <Icon className="w-4 h-4" />
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1">
          {tab === 'company' && (
            <div className="glass-card p-6 space-y-6">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <Building2 className="w-5 h-5 text-brand-400" />
                Dados da Corretora
              </h2>

              {saved && (
                <div className="px-3 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" /> Dados salvos com sucesso!
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-xs text-white/60 mb-1.5 font-medium">Nome da Corretora *</label>
                  <input className="input-glass" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-xs text-white/60 mb-1.5 font-medium">CNPJ</label>
                  <input className="input-glass" value={form.cnpj} onChange={e => setForm(p => ({ ...p, cnpj: e.target.value }))} placeholder="00.000.000/0001-00" />
                </div>
                <div>
                  <label className="block text-xs text-white/60 mb-1.5 font-medium">Email</label>
                  <input type="email" className="input-glass" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-xs text-white/60 mb-1.5 font-medium">Telefone</label>
                  <input className="input-glass" value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-xs text-white/60 mb-1.5 font-medium">Cidade</label>
                  <input className="input-glass" value={form.city} onChange={e => setForm(p => ({ ...p, city: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-xs text-white/60 mb-1.5 font-medium">Estado</label>
                  <select className="input-glass" value={form.state} onChange={e => setForm(p => ({ ...p, state: e.target.value }))}>
                    <option value="">Selecione</option>
                    {['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'].map(uf => <option key={uf} value={uf}>{uf}</option>)}
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block text-xs text-white/60 mb-1.5 font-medium">Endereço</label>
                  <input className="input-glass" value={form.address} onChange={e => setForm(p => ({ ...p, address: e.target.value }))} />
                </div>
              </div>

              <div className="flex justify-end">
                <button onClick={saveCompany} disabled={saving} className="btn-primary">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Salvar Alterações
                </button>
              </div>
            </div>
          )}

          {tab === 'users' && (
            <div className="glass-card p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                  <Users className="w-5 h-5 text-brand-400" />
                  Usuários
                </h2>
                <button className="btn-primary text-xs">
                  <Plus className="w-4 h-4" />
                  Convidar Usuário
                </button>
              </div>

              <div className="glass-card p-4 flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-brand-600/30 border border-brand-500/30 flex items-center justify-center">
                  <span className="text-brand-300 font-bold">{profile?.full_name?.charAt(0) ?? 'U'}</span>
                </div>
                <div className="flex-1">
                  <div className="text-sm font-semibold text-white/90">{profile?.full_name}</div>
                  <div className="text-xs text-white/50">{profile?.email}</div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="badge-blue capitalize">{profile?.role ?? 'owner'}</span>
                  <span className="badge-green">Você</span>
                </div>
              </div>

              <div className="text-center py-6 text-white/40 text-sm border-t border-white/[0.06]">
                <Users className="w-8 h-8 mx-auto mb-2 opacity-30" />
                Nenhum outro usuário convidado
                <div className="text-xs mt-1 text-white/30">Convide membros da equipe para colaborar</div>
              </div>
            </div>
          )}

          {tab === 'notifications' && (
            <div className="glass-card p-6 space-y-4">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <Bell className="w-5 h-5 text-brand-400" />
                Notificações
              </h2>
              {[
                { label: 'Renovações próximas', desc: 'Alertar 30 dias antes do vencimento', enabled: true },
                { label: 'Novas propostas', desc: 'Notificar quando uma proposta for criada', enabled: true },
                { label: 'Pagamentos de comissão', desc: 'Alertar sobre comissões recebidas', enabled: false },
                { label: 'Aniversários de clientes', desc: 'Lembrete diário de aniversariantes', enabled: true },
                { label: 'Tarefas atrasadas', desc: 'Alertar sobre tarefas não concluídas', enabled: false },
              ].map((n, i) => (
                <div key={i} className="flex items-center justify-between p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                  <div>
                    <div className="text-sm font-medium text-white/90">{n.label}</div>
                    <div className="text-xs text-white/40 mt-0.5">{n.desc}</div>
                  </div>
                  <div className={`w-10 h-5 rounded-full border transition-colors cursor-pointer ${n.enabled ? 'bg-brand-600/50 border-brand-500/50' : 'bg-white/[0.06] border-white/[0.10]'}`}>
                    <div className={`w-4 h-4 rounded-full bg-white transition-transform m-0.5 ${n.enabled ? 'translate-x-5' : 'translate-x-0'}`} />
                  </div>
                </div>
              ))}
            </div>
          )}

          {tab === 'api' && (
            <div className="glass-card p-6 space-y-4">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <Key className="w-5 h-5 text-brand-400" />
                API Keys & Webhooks
              </h2>
              <div className="glass-card border border-brand-500/15 bg-brand-500/5 p-4">
                <div className="text-xs text-brand-400 font-semibold mb-1">Sua API Key</div>
                <div className="flex items-center gap-3">
                  <code className="flex-1 text-xs text-white/70 bg-black/20 px-3 py-2 rounded-lg font-mono">ck_live_••••••••••••••••••••••••••••</code>
                  <button className="btn-glass text-xs"><Eye className="w-3.5 h-3.5" /></button>
                </div>
                <div className="text-[10px] text-white/30 mt-1.5">Nunca compartilhe esta chave publicamente</div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-white/80">Webhooks</span>
                  <button className="btn-glass text-xs"><Plus className="w-3.5 h-3.5" /> Adicionar</button>
                </div>
                <div className="text-center py-8 text-white/40 text-sm">
                  <Webhook className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  Nenhum webhook configurado
                </div>
              </div>
            </div>
          )}

          {tab === 'plan' && (
            <div className="space-y-4">
              <div className="glass-card p-5 border border-brand-500/20 bg-brand-500/5">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm text-white/60">Plano atual</div>
                    <div className="text-xl font-bold text-white capitalize">{tenant?.plan ?? 'starter'}</div>
                  </div>
                  <span className="badge-green text-sm">Ativo</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {Object.entries(planConfig).map(([key, plan]) => {
                  const isCurrent = tenant?.plan === key;
                  return (
                    <div key={key} className={`glass-card p-5 transition-all ${isCurrent ? `border ${plan.color} bg-brand-500/5` : ''}`}>
                      {isCurrent && <div className="badge-green mb-3">Plano atual</div>}
                      <div className="text-base font-bold text-white">{plan.label}</div>
                      <div className="text-lg text-brand-400 font-bold mt-1 mb-3">{plan.price}</div>
                      <div className="space-y-1.5">
                        {plan.features.map(f => (
                          <div key={f} className="text-xs text-white/60 flex items-center gap-2">
                            <CheckCircle className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                            {f}
                          </div>
                        ))}
                      </div>
                      {!isCurrent && (
                        <button className="btn-primary w-full justify-center mt-4 text-xs">
                          Fazer upgrade
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
