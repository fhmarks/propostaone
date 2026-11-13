import React, { useEffect, useState, useCallback } from 'react';
import {
  Plus, DollarSign, TrendingUp, Percent, Loader2,
  MoreVertical, ChevronRight, Trash2, X, ArrowUpDown
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Pipeline, PipelineStage, Opportunity, Client } from '../types';

const stageColors = ['bg-brand-500', 'bg-cyan-500', 'bg-amber-500', 'bg-violet-500', 'bg-emerald-500', 'bg-rose-500'];
const stageBorderColors = ['border-brand-500/30', 'border-cyan-500/30', 'border-amber-500/30', 'border-violet-500/30', 'border-emerald-500/30', 'border-rose-500/30'];
const stageHeaderColors = ['bg-brand-500/10', 'bg-cyan-500/10', 'bg-amber-500/10', 'bg-violet-500/10', 'bg-emerald-500/10', 'bg-rose-500/10'];

const fmt = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(v);

const avatarInitials = (name: string) => name.split(' ').map(p => p[0]).join('').toUpperCase().slice(0, 2);
const avatarColor = (name: string) => {
  const colors = ['bg-brand-600/30 text-brand-300', 'bg-emerald-600/30 text-emerald-300', 'bg-amber-600/30 text-amber-300'];
  return colors[name.charCodeAt(0) % colors.length];
};

interface OpportunityCardProps {
  opp: Opportunity & { client?: Client };
  onDelete: (id: string) => void;
  onDragStart: (e: React.DragEvent, id: string) => void;
}

function OpportunityCard({ opp, onDelete, onDragStart }: OpportunityCardProps) {
  const [menu, setMenu] = useState(false);
  return (
    <div
      draggable
      onDragStart={e => onDragStart(e, opp.id)}
      className="kanban-card group animate-slide-up"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold text-white/90 leading-tight line-clamp-2">{opp.title}</div>
          {opp.client && (
            <div className={`inline-flex items-center gap-1.5 mt-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium ${avatarColor(opp.client.full_name)} bg-white/[0.06]`}>
              {avatarInitials(opp.client.full_name)} {opp.client.full_name.split(' ')[0]}
            </div>
          )}
        </div>
        <div className="relative flex-shrink-0">
          <button
            onClick={() => setMenu(!menu)}
            className="w-6 h-6 rounded-lg opacity-0 group-hover:opacity-100 bg-white/[0.08] flex items-center justify-center text-white/50 hover:text-white transition-all"
          >
            <MoreVertical className="w-3.5 h-3.5" />
          </button>
          {menu && (
            <div className="absolute right-0 top-7 w-32 glass-card border border-white/10 rounded-xl overflow-hidden shadow-glass-lg z-20">
              <button
                onClick={() => { onDelete(opp.id); setMenu(false); }}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-400 hover:bg-red-500/10 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Excluir
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="mt-3 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-white/80 font-bold text-base">{fmt(opp.value)}</span>
          <div className="flex items-center gap-1 text-[10px] text-white/40">
            <Percent className="w-3 h-3" />
            {opp.probability}%
          </div>
        </div>

        {/* Probability bar */}
        <div className="h-1 bg-white/[0.06] rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-brand-500 to-cyan-400 rounded-full"
            style={{ width: `${opp.probability}%` }}
          />
        </div>

        <div className="flex items-center justify-between text-[10px] text-white/30">
          {opp.product_type && <span>{opp.product_type}</span>}
          {opp.expected_close && (
            <span>Fecha {new Date(opp.expected_close).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}</span>
          )}
        </div>
      </div>
    </div>
  );
}

interface NewOppFormProps {
  stageId: string;
  stages: PipelineStage[];
  clients: Client[];
  onClose: () => void;
  onSaved: () => void;
}

function NewOppForm({ stageId, stages, clients, onClose, onSaved }: NewOppFormProps) {
  const [form, setForm] = useState({ title: '', client_id: '', stage_id: stageId, value: '', probability: '50', product_type: '', expected_close: '', insurer: '' });
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!form.title.trim()) return;
    setSaving(true);
    await supabase.from('propostaone_opportunities').insert({
      ...form,
      value: parseFloat(form.value) || 0,
      probability: parseInt(form.probability) || 50,
      client_id: form.client_id || null,
      status: 'open',
    });
    onSaved(); onClose();
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-content">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-semibold text-white">Nova Oportunidade</h3>
          <button onClick={onClose} className="text-white/40 hover:text-white transition-colors"><X className="w-5 h-5" /></button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-xs text-white/60 mb-1.5 font-medium">Título *</label>
            <input className="input-glass" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="Ex: Seguro Auto - Honda Civic" autoFocus />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-white/60 mb-1.5 font-medium">Valor Estimado</label>
              <input type="number" className="input-glass" value={form.value} onChange={e => setForm(p => ({ ...p, value: e.target.value }))} placeholder="0,00" />
            </div>
            <div>
              <label className="block text-xs text-white/60 mb-1.5 font-medium">Probabilidade (%)</label>
              <input type="number" min="0" max="100" className="input-glass" value={form.probability} onChange={e => setForm(p => ({ ...p, probability: e.target.value }))} />
            </div>
          </div>
          <div>
            <label className="block text-xs text-white/60 mb-1.5 font-medium">Cliente</label>
            <select className="input-glass" value={form.client_id} onChange={e => setForm(p => ({ ...p, client_id: e.target.value }))}>
              <option value="">Selecionar cliente...</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.full_name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-white/60 mb-1.5 font-medium">Produto</label>
              <input className="input-glass" value={form.product_type} onChange={e => setForm(p => ({ ...p, product_type: e.target.value }))} placeholder="Auto, Vida, Saúde..." />
            </div>
            <div>
              <label className="block text-xs text-white/60 mb-1.5 font-medium">Seguradora</label>
              <input className="input-glass" value={form.insurer} onChange={e => setForm(p => ({ ...p, insurer: e.target.value }))} placeholder="Porto, Azul..." />
            </div>
          </div>
          <div>
            <label className="block text-xs text-white/60 mb-1.5 font-medium">Previsão de Fechamento</label>
            <input type="date" className="input-glass" value={form.expected_close} onChange={e => setForm(p => ({ ...p, expected_close: e.target.value }))} />
          </div>
          <div>
            <label className="block text-xs text-white/60 mb-1.5 font-medium">Etapa</label>
            <select className="input-glass" value={form.stage_id} onChange={e => setForm(p => ({ ...p, stage_id: e.target.value }))}>
              {stages.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={onClose} className="btn-glass flex-1 justify-center">Cancelar</button>
            <button onClick={save} disabled={saving || !form.title.trim()} className="btn-primary flex-1 justify-center">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Criar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PipelinePage() {
  const [pipeline, setPipeline] = useState<Pipeline | null>(null);
  const [stages, setStages] = useState<PipelineStage[]>([]);
  const [opportunities, setOpportunities] = useState<(Opportunity & { client?: Client })[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [addToStage, setAddToStage] = useState<string | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);

    // Get or create default pipeline
    let { data: pipelines } = await supabase.from('propostaone_pipelines').select('*').eq('active', true).limit(1);
    let pl = pipelines?.[0];

    if (!pl) {
      const { data: newPl } = await supabase.from('propostaone_pipelines').insert({ name: 'Pipeline Principal', active: true }).select().single();
      pl = newPl;
      if (pl) {
        const defaultStages = [
          { name: 'Prospecção', sort_order: 0, probability: 10, pipeline_id: pl.id, color: '#60a5fa' },
          { name: 'Qualificação', sort_order: 1, probability: 25, pipeline_id: pl.id, color: '#22d3ee' },
          { name: 'Proposta', sort_order: 2, probability: 50, pipeline_id: pl.id, color: '#f59e0b' },
          { name: 'Negociação', sort_order: 3, probability: 75, pipeline_id: pl.id, color: '#a78bfa' },
          { name: 'Fechado', sort_order: 4, probability: 100, pipeline_id: pl.id, color: '#34d399' },
        ];
        await supabase.from('propostaone_pipeline_stages').insert(defaultStages);
      }
    }

    if (!pl) { setLoading(false); return; }
    setPipeline(pl as Pipeline);

    const [stagesRes, oppsRes, clientsRes] = await Promise.all([
      supabase.from('propostaone_pipeline_stages').select('*').eq('pipeline_id', pl.id).order('sort_order'),
      supabase.from('propostaone_opportunities').select('*, client:propostaone_clients(id, full_name)').eq('pipeline_id', pl.id).eq('status', 'open').order('sort_order'),
      supabase.from('propostaone_clients').select('id, full_name').order('full_name').limit(100),
    ]);

    setStages((stagesRes.data ?? []) as PipelineStage[]);
    setOpportunities((oppsRes.data ?? []) as (Opportunity & { client?: Client })[]);
    setClients((clientsRes.data ?? []) as Client[]);
    setLoading(false);
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  async function deleteOpp(id: string) {
    await supabase.from('propostaone_opportunities').delete().eq('id', id);
    setOpportunities(prev => prev.filter(o => o.id !== id));
  }

  async function handleDrop(stageId: string) {
    if (!dragId || dragId === stageId) return;
    await supabase.from('propostaone_opportunities').update({ stage_id: stageId }).eq('id', dragId);
    setOpportunities(prev => prev.map(o => o.id === dragId ? { ...o, stage_id: stageId } : o));
    setDragId(null);
  }

  const totalValue = opportunities.reduce((s, o) => s + (o.value ?? 0), 0);

  if (loading) {
    return (
      <div className="page-wrapper">
        <div className="h-64 flex items-center justify-center">
          <Loader2 className="w-6 h-6 text-brand-400 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="page-wrapper">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Funil Comercial</h1>
          <p className="page-subtitle">
            {opportunities.length} oportunidades · {fmt(totalValue)} em negociação
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button className="btn-glass">
            <ArrowUpDown className="w-4 h-4" />
            Ordenar
          </button>
          <button onClick={() => setAddToStage(stages[0]?.id ?? null)} className="btn-primary">
            <Plus className="w-4 h-4" />
            Nova Oportunidade
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="glass-card p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center">
            <TrendingUp className="w-4 h-4 text-brand-400" />
          </div>
          <div>
            <div className="text-lg font-bold text-white">{opportunities.length}</div>
            <div className="text-xs text-white/50">Oportunidades abertas</div>
          </div>
        </div>
        <div className="glass-card p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
            <DollarSign className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <div className="text-lg font-bold text-white">{fmt(totalValue)}</div>
            <div className="text-xs text-white/50">Valor total em negociação</div>
          </div>
        </div>
        <div className="glass-card p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
            <Percent className="w-4 h-4 text-amber-400" />
          </div>
          <div>
            <div className="text-lg font-bold text-white">
              {opportunities.length > 0
                ? Math.round(opportunities.reduce((s, o) => s + o.probability, 0) / opportunities.length)
                : 0}%
            </div>
            <div className="text-xs text-white/50">Probabilidade média</div>
          </div>
        </div>
      </div>

      {/* Kanban */}
      <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
        {stages.map((stage, idx) => {
          const stageOpps = opportunities.filter(o => o.stage_id === stage.id);
          const stageValue = stageOpps.reduce((s, o) => s + (o.value ?? 0), 0);
          const colorIdx = idx % stageColors.length;

          return (
            <div
              key={stage.id}
              className={`flex-shrink-0 w-72 rounded-2xl border ${stageBorderColors[colorIdx]} overflow-hidden`}
              onDragOver={e => e.preventDefault()}
              onDrop={() => handleDrop(stage.id)}
            >
              {/* Stage header */}
              <div className={`${stageHeaderColors[colorIdx]} px-4 py-3 border-b ${stageBorderColors[colorIdx]}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${stageColors[colorIdx]}`} />
                    <span className="font-semibold text-white/90 text-sm">{stage.name}</span>
                    <span className="text-xs bg-white/10 text-white/50 px-1.5 py-0.5 rounded-full">{stageOpps.length}</span>
                  </div>
                  <button
                    onClick={() => setAddToStage(stage.id)}
                    className="w-6 h-6 rounded-lg bg-white/[0.08] hover:bg-white/[0.15] flex items-center justify-center text-white/50 hover:text-white transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="text-xs text-white/40 mt-1">{fmt(stageValue)}</div>
              </div>

              {/* Cards */}
              <div className="p-3 space-y-2 min-h-[200px] backdrop-blur-sm bg-white/[0.01]">
                {stageOpps.map(opp => (
                  <OpportunityCard
                    key={opp.id}
                    opp={opp}
                    onDelete={deleteOpp}
                    onDragStart={(e, id) => { e.dataTransfer.effectAllowed = 'move'; setDragId(id); }}
                  />
                ))}
                {stageOpps.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-8 text-white/20 text-xs">
                    <ChevronRight className="w-6 h-6 mb-1 opacity-50" />
                    Arraste cards aqui
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {addToStage && (
        <NewOppForm
          stageId={addToStage}
          stages={stages}
          clients={clients}
          onClose={() => setAddToStage(null)}
          onSaved={fetch}
        />
      )}
    </div>
  );
}
