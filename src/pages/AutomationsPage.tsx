import React, { useEffect, useState } from 'react';
import {
  Zap, Plus, Play, Pause, Trash2, Clock, Gift, RefreshCw,
  FileCheck, UserPlus, X, ChevronRight, CheckCircle, Activity,
  Loader2, ToggleLeft, ToggleRight
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Automation } from '../types';

const triggerConfig: Record<string, { label: string; description: string; icon: React.ComponentType<{className?:string}>; color: string }> = {
  birthday:         { label: 'Aniversário',          description: 'Quando um cliente faz aniversário',              icon: Gift,       color: 'text-amber-400'  },
  renewal_days:     { label: 'Renovação Próxima',    description: 'X dias antes do vencimento de uma apólice',      icon: RefreshCw,  color: 'text-brand-400'  },
  proposal_approved:{ label: 'Proposta Aprovada',    description: 'Quando uma proposta é aprovada',                 icon: FileCheck,  color: 'text-emerald-400' },
  policy_expired:   { label: 'Apólice Expirada',     description: 'Quando uma apólice vence sem renovação',         icon: Clock,      color: 'text-red-400'    },
  lead_created:     { label: 'Novo Lead',            description: 'Quando um lead é criado no sistema',             icon: UserPlus,   color: 'text-cyan-400'   },
  manual:           { label: 'Manual',               description: 'Acionada manualmente pelo usuário',              icon: Play,       color: 'text-white/60'   },
};

const actionTypeLabels: Record<string, string> = {
  send_whatsapp: '💬 Enviar WhatsApp',
  send_email:    '📧 Enviar Email',
  create_task:   '✅ Criar Tarefa',
  create_policy: '📄 Criar Apólice',
  notify_agent:  '🔔 Notificar Corretor',
};

const EXAMPLE_AUTOMATIONS = [
  {
    name: 'Feliz Aniversário',
    trigger_type: 'birthday',
    description: 'Envia mensagem de aniversário automaticamente',
    actions: [{ type: 'send_whatsapp', config: { message: 'Parabéns pelo seu aniversário! 🎂' } }],
    active: true,
    runs_count: 47,
  },
  {
    name: 'Aviso de Renovação 30 dias',
    trigger_type: 'renewal_days',
    description: 'Cria tarefa e envia WhatsApp 30 dias antes do vencimento',
    actions: [
      { type: 'create_task', config: { title: 'Contatar cliente para renovação' } },
      { type: 'send_whatsapp', config: { message: 'Sua apólice vence em 30 dias...' } },
    ],
    active: true,
    runs_count: 23,
  },
  {
    name: 'Pós-emissão',
    trigger_type: 'proposal_approved',
    description: 'Ao aprovar proposta, cria apólice e gera comissão',
    actions: [
      { type: 'create_policy', config: {} },
      { type: 'notify_agent', config: { message: 'Nova apólice emitida!' } },
    ],
    active: false,
    runs_count: 8,
  },
];

interface NewAutoFormProps {
  onClose: () => void;
  onSaved: () => void;
}

function NewAutoForm({ onClose, onSaved }: NewAutoFormProps) {
  const [form, setForm] = useState({
    name: '',
    description: '',
    trigger_type: 'birthday',
    actions: [{ type: 'send_whatsapp', config: {} }],
  });
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!form.name.trim()) return;
    setSaving(true);
    await supabase.from('propostaone_automations').insert({
      ...form,
      trigger_config: {},
      conditions: [],
      active: true,
    });
    onSaved(); onClose();
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-content">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-semibold text-white">Nova Automação</h3>
          <button onClick={onClose} className="text-white/40 hover:text-white"><X className="w-5 h-5" /></button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs text-white/60 mb-1.5 font-medium">Nome *</label>
            <input className="input-glass" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Ex: Aviso de renovação 30 dias" autoFocus />
          </div>
          <div>
            <label className="block text-xs text-white/60 mb-1.5 font-medium">Descrição</label>
            <input className="input-glass" value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="Descreva o objetivo desta automação" />
          </div>
          <div>
            <label className="block text-xs text-white/60 mb-1.5 font-medium">Gatilho</label>
            <select className="input-glass" value={form.trigger_type} onChange={e => setForm(p => ({ ...p, trigger_type: e.target.value }))}>
              {Object.entries(triggerConfig).map(([k, v]) => <option key={k} value={k}>{v.label} — {v.description}</option>)}
            </select>
          </div>

          <div>
            <div className="text-xs text-white/60 mb-2 font-medium">Ações</div>
            {form.actions.map((action, i) => (
              <div key={i} className="flex items-center gap-2 mb-2">
                <select
                  className="input-glass flex-1"
                  value={action.type}
                  onChange={e => setForm(p => ({ ...p, actions: p.actions.map((a, j) => j === i ? { ...a, type: e.target.value } : a) }))}
                >
                  {Object.entries(actionTypeLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
                {form.actions.length > 1 && (
                  <button onClick={() => setForm(p => ({ ...p, actions: p.actions.filter((_, j) => j !== i) }))} className="text-red-400/60 hover:text-red-400 transition-colors">
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
            <button
              onClick={() => setForm(p => ({ ...p, actions: [...p.actions, { type: 'send_whatsapp', config: {} }] }))}
              className="btn-ghost text-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              Adicionar ação
            </button>
          </div>

          <div className="flex gap-3 pt-2">
            <button onClick={onClose} className="btn-glass flex-1 justify-center">Cancelar</button>
            <button onClick={save} disabled={saving || !form.name.trim()} className="btn-primary flex-1 justify-center">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Criar Automação'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AutomationsPage() {
  const [automations, setAutomations] = useState<Automation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  async function fetchAutomations() {
    setLoading(true);
    const { data } = await supabase.from('propostaone_automations').select('*').order('created_at', { ascending: false });
    setAutomations((data ?? []) as Automation[]);
    setLoading(false);
  }

  useEffect(() => { fetchAutomations(); }, []);

  async function toggleActive(id: string, active: boolean) {
    await supabase.from('propostaone_automations').update({ active: !active }).eq('id', id);
    setAutomations(prev => prev.map(a => a.id === id ? { ...a, active: !active } : a));
  }

  async function deleteAutomation(id: string) {
    if (!confirm('Excluir esta automação?')) return;
    await supabase.from('propostaone_automations').delete().eq('id', id);
    setAutomations(prev => prev.filter(a => a.id !== id));
  }

  const allAutomations = automations.length > 0 ? automations : EXAMPLE_AUTOMATIONS as unknown as Automation[];
  const activeCount = allAutomations.filter(a => a.active).length;
  const totalRuns = allAutomations.reduce((s, a) => s + (a.runs_count ?? 0), 0);

  return (
    <div className="page-wrapper">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Automações</h1>
          <p className="page-subtitle">{activeCount} automações ativas · {totalRuns} execuções totais</p>
        </div>
        <button onClick={() => setShowForm(true)} className="btn-primary">
          <Plus className="w-4 h-4" />
          Nova Automação
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total de automações', value: allAutomations.length, color: 'brand', icon: Zap },
          { label: 'Ativas agora', value: activeCount, color: 'green', icon: Activity },
          { label: 'Total de execuções', value: totalRuns, color: 'amber', icon: CheckCircle },
        ].map((s, i) => {
          const Icon = s.icon;
          const c = s.color === 'brand' ? 'bg-brand-500/10 border-brand-500/20 text-brand-400' : s.color === 'green' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-amber-500/10 border-amber-500/20 text-amber-400';
          return (
            <div key={i} className="glass-card p-4 flex items-center gap-3">
              <div className={`w-9 h-9 rounded-xl border flex items-center justify-center ${c}`}><Icon className="w-5 h-5" /></div>
              <div><div className="text-lg font-bold text-white">{s.value}</div><div className="text-xs text-white/50">{s.label}</div></div>
            </div>
          );
        })}
      </div>

      {/* Template gallery */}
      <div>
        <h2 className="text-sm font-semibold text-white/60 uppercase tracking-wider mb-3">Modelos prontos</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { trigger: 'birthday', title: 'Aniversário', desc: 'Envie mensagem de parabéns automaticamente', actions: ['Enviar WhatsApp'] },
            { trigger: 'renewal_days', title: 'Alerta de Renovação', desc: 'Avise 30 dias antes do vencimento', actions: ['Criar Tarefa', 'Enviar WhatsApp'] },
            { trigger: 'proposal_approved', title: 'Proposta Aprovada', desc: 'Crie apólice ao fechar negócio', actions: ['Criar Apólice', 'Notificar Corretor'] },
          ].map((tmpl, i) => {
            const cfg = triggerConfig[tmpl.trigger];
            const Icon = cfg.icon;
            return (
              <div key={i} className="glass-card-hover p-5 group">
                <div className="flex items-center gap-2 mb-3">
                  <div className={`w-8 h-8 rounded-xl bg-white/[0.08] border border-white/[0.10] flex items-center justify-center`}>
                    <Icon className={`w-4 h-4 ${cfg.color}`} />
                  </div>
                  <span className="font-semibold text-white/90 text-sm">{tmpl.title}</span>
                </div>
                <div className="text-xs text-white/50 mb-3">{tmpl.desc}</div>
                <div className="space-y-1.5 mb-4">
                  {tmpl.actions.map((a, j) => (
                    <div key={j} className="flex items-center gap-2 text-xs text-white/40">
                      <ChevronRight className="w-3 h-3 text-brand-400" />
                      {a}
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => setShowForm(true)}
                  className="btn-glass w-full justify-center text-xs group-hover:bg-brand-600/20 group-hover:border-brand-500/25 group-hover:text-white transition-all"
                >
                  Usar modelo
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Active automations */}
      <div>
        <h2 className="text-sm font-semibold text-white/60 uppercase tracking-wider mb-3">Suas automações</h2>
        {loading ? (
          <div className="glass-card p-8 flex items-center justify-center"><Loader2 className="w-6 h-6 text-brand-400 animate-spin" /></div>
        ) : allAutomations.length === 0 ? (
          <div className="glass-card p-12 text-center">
            <Zap className="w-12 h-12 mx-auto text-white/20 mb-3" />
            <div className="text-white/50">Nenhuma automação criada</div>
          </div>
        ) : (
          <div className="space-y-3">
            {allAutomations.map((a, i) => {
              const cfg = triggerConfig[a.trigger_type] ?? triggerConfig.manual;
              const Icon = cfg.icon;
              return (
                <div key={a.id ?? i} className="glass-card p-5 flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-xl bg-white/[0.06] border border-white/[0.10] flex items-center justify-center flex-shrink-0`}>
                    <Icon className={`w-5 h-5 ${cfg.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-white/90 text-sm">{a.name}</span>
                      <span className={`badge ${a.active ? 'badge-green' : 'badge-gray'}`}>{a.active ? 'Ativa' : 'Inativa'}</span>
                    </div>
                    <div className="text-xs text-white/50 mt-0.5">{a.description}</div>
                    <div className="flex items-center gap-3 mt-2">
                      <span className="text-[10px] text-white/30 flex items-center gap-1">
                        <Zap className="w-3 h-3" />
                        Gatilho: {cfg.label}
                      </span>
                      {a.runs_count > 0 && (
                        <span className="text-[10px] text-white/30 flex items-center gap-1">
                          <Activity className="w-3 h-3" />
                          {a.runs_count} execuções
                        </span>
                      )}
                    </div>
                    <div className="flex gap-2 mt-2">
                      {(a.actions as { type: string }[])?.map((act, j) => (
                        <span key={j} className="text-[10px] bg-white/[0.06] text-white/50 px-2 py-0.5 rounded-full border border-white/[0.08]">
                          {actionTypeLabels[act.type] ?? act.type}
                        </span>
                      ))}
                    </div>
                  </div>
                  {a.id && (
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button onClick={() => toggleActive(a.id, a.active)} className={`transition-colors ${a.active ? 'text-emerald-400 hover:text-white/60' : 'text-white/30 hover:text-emerald-400'}`}>
                        {a.active ? <ToggleRight className="w-6 h-6" /> : <ToggleLeft className="w-6 h-6" />}
                      </button>
                      <button onClick={() => deleteAutomation(a.id)} className="text-red-400/50 hover:text-red-400 transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showForm && <NewAutoForm onClose={() => setShowForm(false)} onSaved={fetchAutomations} />}
    </div>
  );
}
