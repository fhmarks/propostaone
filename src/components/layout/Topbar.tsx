import React, { useState, useEffect } from 'react';
import { Bell, Search, X, CheckCheck } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import type { Notification } from '../../types';
import type { AppPage } from './Sidebar';

const pageTitles: Record<AppPage, string> = {
  dashboard: 'Dashboard',
  crm: 'CRM',
  pipeline: 'Funil Comercial',
  agenda: 'Agenda',
  policies: 'Apólices',
  financial: 'Financeiro',
  documents: 'Documentos',
  communication: 'Comunicação',
  automations: 'Automações',
  reports: 'Relatórios',
  marketplace: 'Marketplace de Seguradoras',
  settings: 'Configurações',
  admin: 'Administração',
};

const pageSubtitles: Record<AppPage, string> = {
  dashboard: 'Visão geral da sua corretora',
  crm: 'Gestão de clientes, leads e empresas',
  pipeline: 'Funil de vendas e oportunidades',
  agenda: 'Compromissos, tarefas e visitas',
  policies: 'Gestão de apólices e sinistros',
  financial: 'Comissões, recebimentos e repasses',
  documents: 'Arquivos e documentos',
  communication: 'WhatsApp, email e histórico',
  automations: 'Regras e fluxos automatizados',
  reports: 'Produção, conversão e rankings',
  marketplace: 'Conecte seguradoras ao seu sistema',
  settings: 'Dados da empresa e preferências',
  admin: 'Usuários, equipes e auditoria',
};

interface TopbarProps {
  currentPage: AppPage;
}

export default function Topbar({ currentPage }: TopbarProps) {
  const { profile } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (!profile) return;

    supabase
      .from('propostaone_notifications')
      .select('*')
      .eq('profile_id', profile.id)
      .eq('read', false)
      .order('created_at', { ascending: false })
      .limit(10)
      .then(({ data }) => {
        if (data) setNotifications(data as Notification[]);
      });
  }, [profile]);

  async function markAllRead() {
    if (!profile) return;
    await supabase
      .from('propostaone_notifications')
      .update({ read: true })
      .eq('profile_id', profile.id)
      .eq('read', false);
    setNotifications([]);
    setShowNotifications(false);
  }

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <header className="h-16 border-b border-white/[0.06] flex items-center px-6 gap-4 bg-white/[0.01] backdrop-blur-sm flex-shrink-0">
      {/* Page info */}
      <div className="flex-1 min-w-0">
        <h2 className="text-base font-semibold text-white leading-tight">{pageTitles[currentPage]}</h2>
        <p className="text-xs text-white/40">{pageSubtitles[currentPage]}</p>
      </div>

      {/* Search */}
      <div className="hidden md:flex items-center gap-2 w-64">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Buscar..."
            className="input-glass pl-9 h-9 text-xs"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Notifications */}
      <div className="relative">
        <button
          onClick={() => setShowNotifications(!showNotifications)}
          className="relative w-9 h-9 rounded-xl bg-white/[0.05] border border-white/[0.08] flex items-center justify-center text-white/60 hover:text-white hover:bg-white/[0.08] transition-colors"
        >
          <Bell className="w-4 h-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-brand-500 text-[9px] font-bold text-white flex items-center justify-center">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>

        {showNotifications && (
          <div className="absolute right-0 top-full mt-2 w-80 glass-card border border-white/[0.10] rounded-2xl shadow-glass-lg overflow-hidden z-50 animate-slide-up">
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
              <span className="text-sm font-semibold text-white">Notificações</span>
              {unreadCount > 0 && (
                <button onClick={markAllRead} className="text-xs text-brand-400 hover:text-brand-300 flex items-center gap-1 transition-colors">
                  <CheckCheck className="w-3.5 h-3.5" />
                  Marcar todas como lidas
                </button>
              )}
            </div>

            <div className="max-h-80 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="px-4 py-8 text-center text-white/40 text-sm">
                  <Bell className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  Nenhuma notificação
                </div>
              ) : (
                notifications.map(n => (
                  <div key={n.id} className="px-4 py-3 border-b border-white/[0.04] hover:bg-white/[0.03] transition-colors">
                    <div className="text-sm font-medium text-white/90">{n.title}</div>
                    {n.body && <div className="text-xs text-white/50 mt-0.5">{n.body}</div>}
                    <div className="text-[10px] text-white/30 mt-1">
                      {new Date(n.created_at).toLocaleDateString('pt-BR')}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* User avatar */}
      <div className="w-9 h-9 rounded-xl bg-brand-600/30 border border-brand-500/30 flex items-center justify-center flex-shrink-0">
        <span className="text-brand-300 text-xs font-bold">
          {profile?.full_name?.charAt(0).toUpperCase() ?? 'U'}
        </span>
      </div>
    </header>
  );
}
