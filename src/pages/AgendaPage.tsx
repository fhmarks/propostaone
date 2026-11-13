import React, { useEffect, useState, useCallback } from 'react';
import {
  Plus, ChevronLeft, ChevronRight, Calendar, Clock,
  MapPin, X, Loader2, Phone, Users, RefreshCw, CheckSquare, MoreVertical
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { CalendarEvent } from '../types';

const DAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const MONTHS = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

const typeConfig: Record<string, { label: string; icon: React.ComponentType<{className?:string}>; color: string; bg: string }> = {
  appointment: { label: 'Compromisso', icon: Calendar, color: 'text-brand-400', bg: 'bg-brand-500/20 border-brand-500/30' },
  visit:       { label: 'Visita',       icon: Users,    color: 'text-cyan-400',  bg: 'bg-cyan-500/20 border-cyan-500/30' },
  call:        { label: 'Ligação',      icon: Phone,    color: 'text-amber-400', bg: 'bg-amber-500/20 border-amber-500/30' },
  renewal:     { label: 'Renovação',    icon: RefreshCw,color: 'text-violet-400',bg: 'bg-violet-500/20 border-violet-500/30' },
  task:        { label: 'Tarefa',       icon: CheckSquare,color:'text-emerald-400',bg:'bg-emerald-500/20 border-emerald-500/30' },
  other:       { label: 'Outro',        icon: Calendar, color: 'text-white/60',  bg: 'bg-white/10 border-white/20' },
};

const priorityBadge: Record<string, string> = {
  low: 'badge-gray', normal: 'badge-blue', high: 'badge-amber', urgent: 'badge-red',
};

interface EventFormProps {
  date?: Date;
  event?: CalendarEvent;
  onClose: () => void;
  onSaved: () => void;
}

function EventForm({ date, event, onClose, onSaved }: EventFormProps) {
  const defaultDate = (date ?? new Date()).toISOString().split('T')[0];
  const [form, setForm] = useState({
    title: event?.title ?? '',
    type: event?.type ?? 'appointment',
    start_at: event?.start_at ?? `${defaultDate}T09:00`,
    end_at: event?.end_at ?? `${defaultDate}T10:00`,
    location: event?.location ?? '',
    description: event?.description ?? '',
    priority: event?.priority ?? 'normal',
    all_day: event?.all_day ?? false,
  });
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!form.title.trim()) return;
    setSaving(true);
    const data = { ...form, end_at: form.end_at || null, location: form.location || null, description: form.description || null };
    if (event) await supabase.from('propostaone_events').update(data).eq('id', event.id);
    else await supabase.from('propostaone_events').insert({ ...data, status: 'pending', created_by: null });
    onSaved(); onClose();
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-content">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-semibold text-white">{event ? 'Editar Evento' : 'Novo Evento'}</h3>
          <button onClick={onClose} className="text-white/40 hover:text-white transition-colors"><X className="w-5 h-5" /></button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-xs text-white/60 mb-1.5 font-medium">Título *</label>
            <input className="input-glass" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="Título do evento" autoFocus />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-white/60 mb-1.5 font-medium">Tipo</label>
              <select className="input-glass" value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value as CalendarEvent['type'] }))}>
                {Object.entries(typeConfig).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-white/60 mb-1.5 font-medium">Prioridade</label>
              <select className="input-glass" value={form.priority} onChange={e => setForm(p => ({ ...p, priority: e.target.value as CalendarEvent['priority'] }))}>
                <option value="low">Baixa</option>
                <option value="normal">Normal</option>
                <option value="high">Alta</option>
                <option value="urgent">Urgente</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-white/60 mb-1.5 font-medium">Início</label>
              <input type="datetime-local" className="input-glass" value={form.start_at} onChange={e => setForm(p => ({ ...p, start_at: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs text-white/60 mb-1.5 font-medium">Fim</label>
              <input type="datetime-local" className="input-glass" value={form.end_at} onChange={e => setForm(p => ({ ...p, end_at: e.target.value }))} />
            </div>
          </div>
          <div>
            <label className="block text-xs text-white/60 mb-1.5 font-medium">Local</label>
            <input className="input-glass" value={form.location} onChange={e => setForm(p => ({ ...p, location: e.target.value }))} placeholder="Endereço ou link" />
          </div>
          <div>
            <label className="block text-xs text-white/60 mb-1.5 font-medium">Descrição</label>
            <textarea className="input-glass resize-none" rows={3} value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="Detalhes adicionais..." />
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={onClose} className="btn-glass flex-1 justify-center">Cancelar</button>
            <button onClick={save} disabled={saving || !form.title.trim()} className="btn-primary flex-1 justify-center">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Salvar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AgendaPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editEvent, setEditEvent] = useState<CalendarEvent | undefined>();
  const [view, setView] = useState<'month' | 'week' | 'list'>('month');

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  const fetchEvents = useCallback(async () => {
    const start = new Date(year, month, 1).toISOString();
    const end = new Date(year, month + 1, 0, 23, 59, 59).toISOString();
    const { data } = await supabase.from('propostaone_events').select('*, client:propostaone_clients(full_name)').gte('start_at', start).lte('start_at', end).order('start_at');
    setEvents((data ?? []) as CalendarEvent[]);
  }, [year, month]);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);

  function buildCalendar() {
    const cells: (Date | null)[] = [];
    const startDow = firstDay.getDay();
    for (let i = 0; i < startDow; i++) cells.push(null);
    for (let d = 1; d <= lastDay.getDate(); d++) cells.push(new Date(year, month, d));
    return cells;
  }

  function eventsForDate(date: Date) {
    return events.filter(ev => {
      const evDate = new Date(ev.start_at);
      return evDate.getFullYear() === date.getFullYear() && evDate.getMonth() === date.getMonth() && evDate.getDate() === date.getDate();
    });
  }

  const selectedEvents = selectedDate ? eventsForDate(selectedDate) : [];
  const todayStr = new Date().toDateString();

  async function deleteEvent(id: string) {
    await supabase.from('propostaone_events').delete().eq('id', id);
    fetchEvents();
  }

  const cells = buildCalendar();

  return (
    <div className="page-wrapper">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Agenda</h1>
          <p className="page-subtitle">{MONTHS[month]} de {year}</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="glass-card p-1 flex gap-1">
            {(['month','week','list'] as const).map(v => (
              <button key={v} onClick={() => setView(v)} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${view === v ? 'bg-brand-600/30 text-white border border-brand-500/25' : 'text-white/50 hover:text-white/80'}`}>
                {v === 'month' ? 'Mês' : v === 'week' ? 'Semana' : 'Lista'}
              </button>
            ))}
          </div>
          <div className="flex gap-1">
            <button onClick={() => setCurrentDate(new Date(year, month - 1))} className="btn-glass px-2.5">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button onClick={() => setCurrentDate(new Date())} className="btn-glass text-xs">Hoje</button>
            <button onClick={() => setCurrentDate(new Date(year, month + 1))} className="btn-glass px-2.5">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <button onClick={() => { setEditEvent(undefined); setShowForm(true); }} className="btn-primary">
            <Plus className="w-4 h-4" />
            Novo Evento
          </button>
        </div>
      </div>

      <div className="flex gap-6">
        {/* Calendar */}
        <div className="flex-1 glass-card p-4">
          {/* Day labels */}
          <div className="grid grid-cols-7 mb-2">
            {DAYS.map(d => (
              <div key={d} className="text-center text-xs font-semibold text-white/30 py-2">{d}</div>
            ))}
          </div>

          {/* Cells */}
          <div className="grid grid-cols-7 gap-1">
            {cells.map((date, i) => {
              if (!date) return <div key={i} />;
              const dayEvents = eventsForDate(date);
              const isToday = date.toDateString() === todayStr;
              const isSelected = selectedDate?.toDateString() === date.toDateString();
              return (
                <button
                  key={i}
                  onClick={() => setSelectedDate(date)}
                  className={`relative min-h-[80px] p-2 rounded-xl text-left transition-all duration-150
                    ${isSelected ? 'bg-brand-600/20 border border-brand-500/30' : 'hover:bg-white/[0.04] border border-transparent'}
                    ${isToday ? 'ring-1 ring-brand-500/40' : ''}`}
                >
                  <div className={`text-xs font-semibold mb-1 w-6 h-6 rounded-full flex items-center justify-center
                    ${isToday ? 'bg-brand-500 text-white' : 'text-white/60'}`}>
                    {date.getDate()}
                  </div>
                  <div className="space-y-0.5">
                    {dayEvents.slice(0, 3).map(ev => {
                      const cfg = typeConfig[ev.type] ?? typeConfig.other;
                      return (
                        <div key={ev.id} className={`text-[9px] px-1.5 py-0.5 rounded-md border truncate font-medium ${cfg.bg} ${cfg.color}`}>
                          {new Date(ev.start_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} {ev.title}
                        </div>
                      );
                    })}
                    {dayEvents.length > 3 && (
                      <div className="text-[9px] text-white/30 pl-1">+{dayEvents.length - 3} mais</div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Side panel */}
        <div className="w-72 space-y-4 flex-shrink-0">
          {/* Selected day */}
          <div className="glass-card p-4">
            <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-brand-400" />
              {selectedDate
                ? selectedDate.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })
                : 'Selecione um dia'
              }
            </h3>

            {!selectedDate ? (
              <div className="text-white/40 text-xs text-center py-4">
                Clique em um dia para ver os eventos
              </div>
            ) : selectedEvents.length === 0 ? (
              <div className="text-white/40 text-xs text-center py-4">
                <Clock className="w-6 h-6 mx-auto mb-2 opacity-40" />
                Nenhum evento este dia
              </div>
            ) : (
              <div className="space-y-2">
                {selectedEvents.map(ev => {
                  const cfg = typeConfig[ev.type] ?? typeConfig.other;
                  const Icon = cfg.icon;
                  return (
                    <div key={ev.id} className={`p-3 rounded-xl border ${cfg.bg} group`}>
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <Icon className={`w-4 h-4 ${cfg.color} flex-shrink-0`} />
                          <div>
                            <div className={`text-xs font-semibold ${cfg.color}`}>{ev.title}</div>
                            <div className="text-[10px] text-white/40 flex items-center gap-1 mt-0.5">
                              <Clock className="w-3 h-3" />
                              {new Date(ev.start_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={() => deleteEvent(ev.id)}
                          className="opacity-0 group-hover:opacity-100 text-red-400/60 hover:text-red-400 transition-all"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      {ev.location && (
                        <div className="text-[10px] text-white/40 mt-1.5 flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {ev.location}
                        </div>
                      )}
                      <span className={`mt-2 inline-block ${priorityBadge[ev.priority] ?? 'badge-gray'}`}>
                        {ev.priority === 'low' ? 'Baixa' : ev.priority === 'high' ? 'Alta' : ev.priority === 'urgent' ? 'Urgente' : 'Normal'}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}

            {selectedDate && (
              <button
                onClick={() => { setEditEvent(undefined); setShowForm(true); }}
                className="btn-glass w-full justify-center mt-3 text-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                Adicionar evento
              </button>
            )}
          </div>

          {/* Upcoming */}
          <div className="glass-card p-4">
            <h3 className="text-sm font-semibold text-white mb-3">Próximos eventos</h3>
            {events
              .filter(ev => new Date(ev.start_at) >= new Date())
              .slice(0, 5)
              .map(ev => {
                const cfg = typeConfig[ev.type] ?? typeConfig.other;
                const Icon = cfg.icon;
                return (
                  <div key={ev.id} className="flex items-center gap-2.5 py-2 border-b border-white/[0.04] last:border-0">
                    <Icon className={`w-4 h-4 ${cfg.color} flex-shrink-0`} />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium text-white/80 truncate">{ev.title}</div>
                      <div className="text-[10px] text-white/40">
                        {new Date(ev.start_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })} · {new Date(ev.start_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>
                );
              })
            }
            {events.filter(ev => new Date(ev.start_at) >= new Date()).length === 0 && (
              <div className="text-center text-white/40 text-xs py-4">
                Nenhum evento próximo
              </div>
            )}
          </div>
        </div>
      </div>

      {showForm && (
        <EventForm
          date={selectedDate ?? undefined}
          event={editEvent}
          onClose={() => setShowForm(false)}
          onSaved={fetchEvents}
        />
      )}
    </div>
  );
}
