import React, { useEffect, useState } from 'react';
import {
  MessageSquare, Mail, Phone, Plus, Search, Send, X,
  Check, Clock, AlertCircle, MessageCircle, Filter, ChevronDown
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { CommunicationHistory, MessageTemplate } from '../types';

const channelConfig: Record<string, { label: string; icon: React.ComponentType<{className?:string}>; color: string; bg: string }> = {
  whatsapp: { label: 'WhatsApp', icon: MessageCircle, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
  email:    { label: 'Email',    icon: Mail,          color: 'text-brand-400',   bg: 'bg-brand-500/10 border-brand-500/20' },
  sms:      { label: 'SMS',      icon: MessageSquare, color: 'text-amber-400',   bg: 'bg-amber-500/10 border-amber-500/20' },
  call:     { label: 'Ligação',  icon: Phone,         color: 'text-cyan-400',    bg: 'bg-cyan-500/10 border-cyan-500/20' },
  meeting:  { label: 'Reunião',  icon: Phone,         color: 'text-violet-400',  bg: 'bg-violet-500/10 border-violet-500/20' },
};

const statusConfig: Record<string, { icon: React.ComponentType<{className?:string}>; color: string }> = {
  sent:      { icon: Check,        color: 'text-white/40' },
  delivered: { icon: Check,        color: 'text-brand-400' },
  read:      { icon: Check,        color: 'text-emerald-400' },
  failed:    { icon: AlertCircle,  color: 'text-red-400' },
  pending:   { icon: Clock,        color: 'text-amber-400' },
};

export default function CommunicationPage() {
  const [history, setHistory] = useState<CommunicationHistory[]>([]);
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [tab, setTab] = useState<'history' | 'templates'>('history');
  const [loading, setLoading] = useState(true);
  const [showNewTemplate, setShowNewTemplate] = useState(false);
  const [newTemplate, setNewTemplate] = useState({ name: '', channel: 'whatsapp', subject: '', body: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([
      supabase.from('propostaone_communication_history').select('*, client:propostaone_clients(full_name)').order('sent_at', { ascending: false }).limit(50),
      supabase.from('propostaone_message_templates').select('*').eq('active', true).order('name'),
    ]).then(([histRes, tmplRes]) => {
      setHistory((histRes.data ?? []) as CommunicationHistory[]);
      setTemplates((tmplRes.data ?? []) as MessageTemplate[]);
      setLoading(false);
    });
  }, []);

  async function saveTemplate() {
    if (!newTemplate.name || !newTemplate.body) return;
    setSaving(true);
    await supabase.from('propostaone_message_templates').insert({ ...newTemplate, active: true });
    const { data } = await supabase.from('propostaone_message_templates').select('*').eq('active', true).order('name');
    setTemplates((data ?? []) as MessageTemplate[]);
    setShowNewTemplate(false);
    setNewTemplate({ name: '', channel: 'whatsapp', subject: '', body: '' });
    setSaving(false);
  }

  return (
    <div className="page-wrapper">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Comunicação</h1>
          <p className="page-subtitle">Histórico de mensagens e templates</p>
        </div>
        <button onClick={() => setShowNewTemplate(true)} className="btn-primary">
          <Plus className="w-4 h-4" />
          Novo Template
        </button>
      </div>

      {/* Channel stats */}
      <div className="grid grid-cols-4 gap-4">
        {(['whatsapp','email','sms','call'] as const).map(ch => {
          const cfg = channelConfig[ch];
          const Icon = cfg.icon;
          const count = history.filter(h => h.channel === ch).length;
          return (
            <div key={ch} className="glass-card p-4 flex items-center gap-3">
              <div className={`w-9 h-9 rounded-xl border flex items-center justify-center flex-shrink-0 ${cfg.bg}`}>
                <Icon className={`w-5 h-5 ${cfg.color}`} />
              </div>
              <div>
                <div className="text-lg font-bold text-white">{count}</div>
                <div className="text-xs text-white/50">{cfg.label}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Tabs */}
      <div className="glass-card p-1 flex gap-1 w-fit">
        {(['history','templates'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${tab === t ? 'bg-brand-600/30 text-white border border-brand-500/25' : 'text-white/50 hover:text-white/80'}`}>
            {t === 'history' ? 'Histórico' : 'Templates'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="glass-card p-8 flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-brand-400 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : tab === 'history' ? (
        <div className="glass-card overflow-hidden">
          {history.length === 0 ? (
            <div className="p-12 text-center">
              <MessageSquare className="w-12 h-12 mx-auto text-white/20 mb-3" />
              <div className="text-white/50">Nenhuma comunicação registrada</div>
              <div className="text-white/30 text-sm mt-1">O histórico de mensagens aparecerá aqui</div>
            </div>
          ) : (
            <table className="table-glass">
              <thead>
                <tr>
                  <th>Canal</th>
                  <th>Cliente</th>
                  <th>Mensagem</th>
                  <th>Direção</th>
                  <th>Status</th>
                  <th>Data</th>
                </tr>
              </thead>
              <tbody>
                {history.map(h => {
                  const chCfg = channelConfig[h.channel] ?? channelConfig.email;
                  const ChIcon = chCfg.icon;
                  const stCfg = statusConfig[h.status] ?? statusConfig.pending;
                  const StIcon = stCfg.icon;
                  return (
                    <tr key={h.id}>
                      <td>
                        <div className={`flex items-center gap-1.5 text-xs font-medium ${chCfg.color}`}>
                          <ChIcon className="w-3.5 h-3.5" />
                          {chCfg.label}
                        </div>
                      </td>
                      <td><div className="text-sm text-white/80">{(h.client as { full_name: string })?.full_name ?? '-'}</div></td>
                      <td>
                        <div className="max-w-xs">
                          {h.subject && <div className="text-xs font-medium text-white/70">{h.subject}</div>}
                          {h.body && <div className="text-xs text-white/40 truncate">{h.body}</div>}
                        </div>
                      </td>
                      <td>
                        <span className={h.direction === 'outbound' ? 'badge-blue' : 'badge-gray'}>
                          {h.direction === 'outbound' ? 'Enviado' : 'Recebido'}
                        </span>
                      </td>
                      <td>
                        <div className={`flex items-center gap-1 text-xs ${stCfg.color}`}>
                          <StIcon className="w-3.5 h-3.5" />
                          {h.status}
                        </div>
                      </td>
                      <td><div className="text-xs text-white/40">{new Date(h.sent_at).toLocaleDateString('pt-BR')}</div></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      ) : (
        /* Templates */
        <div>
          {templates.length === 0 ? (
            <div className="glass-card p-12 text-center">
              <MessageSquare className="w-12 h-12 mx-auto text-white/20 mb-3" />
              <div className="text-white/50">Nenhum template criado</div>
              <div className="text-white/30 text-sm mt-1">Crie templates para agilizar o envio de mensagens</div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {templates.map(t => {
                const chCfg = channelConfig[t.channel] ?? channelConfig.whatsapp;
                const Icon = chCfg.icon;
                return (
                  <div key={t.id} className="glass-card p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className={`w-8 h-8 rounded-lg border flex items-center justify-center ${chCfg.bg}`}>
                          <Icon className={`w-4 h-4 ${chCfg.color}`} />
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-white/90">{t.name}</div>
                          <div className={`text-xs ${chCfg.color}`}>{chCfg.label}</div>
                        </div>
                      </div>
                      {t.category && <span className="badge-gray">{t.category}</span>}
                    </div>
                    {t.subject && <div className="text-xs text-white/60 mb-1 font-medium">Assunto: {t.subject}</div>}
                    <div className="text-xs text-white/50 bg-white/[0.03] rounded-lg p-3 leading-relaxed line-clamp-3">{t.body}</div>
                    {t.variables && t.variables.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {t.variables.map(v => <span key={v} className="text-[10px] bg-brand-500/10 text-brand-400 px-2 py-0.5 rounded-full border border-brand-500/20">{`{{${v}}}`}</span>)}
                      </div>
                    )}
                    <div className="mt-3 flex gap-2">
                      <button className="btn-primary flex-1 justify-center text-xs py-2">
                        <Send className="w-3.5 h-3.5" />
                        Usar template
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* New Template Modal */}
      {showNewTemplate && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowNewTemplate(false)}>
          <div className="modal-content">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-semibold text-white">Novo Template</h3>
              <button onClick={() => setShowNewTemplate(false)} className="text-white/40 hover:text-white transition-colors"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-white/60 mb-1.5 font-medium">Nome do Template *</label>
                <input className="input-glass" value={newTemplate.name} onChange={e => setNewTemplate(p => ({ ...p, name: e.target.value }))} placeholder="Ex: Boas-vindas novo cliente" autoFocus />
              </div>
              <div>
                <label className="block text-xs text-white/60 mb-1.5 font-medium">Canal</label>
                <select className="input-glass" value={newTemplate.channel} onChange={e => setNewTemplate(p => ({ ...p, channel: e.target.value }))}>
                  <option value="whatsapp">WhatsApp</option>
                  <option value="email">Email</option>
                  <option value="sms">SMS</option>
                </select>
              </div>
              {newTemplate.channel === 'email' && (
                <div>
                  <label className="block text-xs text-white/60 mb-1.5 font-medium">Assunto</label>
                  <input className="input-glass" value={newTemplate.subject} onChange={e => setNewTemplate(p => ({ ...p, subject: e.target.value }))} placeholder="Assunto do email" />
                </div>
              )}
              <div>
                <label className="block text-xs text-white/60 mb-1.5 font-medium">Mensagem *</label>
                <textarea className="input-glass resize-none" rows={5} value={newTemplate.body} onChange={e => setNewTemplate(p => ({ ...p, body: e.target.value }))} placeholder="Olá {{nome}}, seja bem-vindo(a)! ..." />
                <div className="text-[10px] text-white/30 mt-1">Use {'{{variavel}}'} para campos dinâmicos</div>
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowNewTemplate(false)} className="btn-glass flex-1 justify-center">Cancelar</button>
                <button onClick={saveTemplate} disabled={saving} className="btn-primary flex-1 justify-center">
                  {saving ? <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> : 'Salvar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
